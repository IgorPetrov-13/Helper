// ==========================================
//  UI-хелперы для работы с сертификатами
// ==========================================

/**
 * Оптимизированный утилитарный парсер DN-строк и дат (оригинальная логика КриптоПро).
 * https://cryptopro.ru/sites/default/files/products/cades/demopage/cades_bes_sample.html
 */
var CertificateAdjuster = {
    checkQuotes: function (str) {
        var result = 0;
        for (var i = 0; i < str.length; i++) if (str[i] === '"') result++;
        return !(result % 2);
    },

    extract: function (from, what) {
        var certName = "";
        var begin = from.indexOf(what);
        if (begin >= 0) {
            var end = from.indexOf(', ', begin);
            while (end > 0) {
                if (this.checkQuotes(from.substr(begin, end - begin))) break;
                end = from.indexOf(', ', end + 1);
            }
            certName = (end < 0) ? from.substr(begin) : from.substr(begin, end - begin);
        }
        return certName;
    },

    print2Digit: function (digit) {
        return (digit < 10) ? "0" + digit : digit;
    },

    GetCertDate: function (paramDate) {
        var certDate = new Date(paramDate);
        if (isNaN(certDate.getTime())) return "Не указана";
        return this.print2Digit(certDate.getUTCDate()) + "." + this.print2Digit(certDate.getUTCMonth() + 1) + "." + certDate.getFullYear() + " " +
            this.print2Digit(certDate.getUTCHours()) + ":" + this.print2Digit(certDate.getUTCMinutes()) + ":" + this.print2Digit(certDate.getUTCSeconds());
    },

    GetCertName: function (certSubjectName) {
        return this.extract(certSubjectName, 'CN=');
    }
};

/**
 * Синхронный класс-контейнер данных сертификата для UI-слоя.
 * Принимает сырой плоский объект данных из адаптера.
 */
var Certificate = function (data, store) {
    var _storeData = store || {};
    var _info = data || {};

    var _validFromDate = _info.validFromDate ? new Date(_info.validFromDate) : null;
    var _validToDate = _info.validToDate ? new Date(_info.validToDate) : null;

    // Системные геттеры
    this.getStore = function () {
        return _storeData;
    };
    this.getSerialNumber = function () {
        return _info.serialNumber || '';
    };
    this.isValid = function () {
        return !!_info.isValid;
    };
    this.hasPrivateKey = function () {
        return !!_info.hasPrivKey;
    };
    this.getBase64Content = function () {
        return _info.content || '';
    };
    this.getValidSince = function () {
        return _validFromDate;
    };
    this.getValidUntil = function () {
        return _validToDate;
    };

    this.getThumbprint = function () {
        return _info.thumbprint ? String(_info.thumbprint).replace(/\s/g, '').toUpperCase() : '';
    };

    this.isExpired = function () {
        if (!_validToDate) return true;
        return new Date() > _validToDate;
    };

    /** Прямое извлечение любого свойства из DN субъекта */
    this.extractSubjectField = function (fieldName) {
        var rawSubject = _info.subjectText || _info.subject || '';
        var token = fieldName.toUpperCase() + '=';
        var extracted = CertificateAdjuster.extract(rawSubject, token);
        if (!extracted) return '';
        return extracted.substring(token.length).trim().replace(/^"|"$/g, '');
    };

    this.getCommonName = function () {
        var rawSubject = _info.subjectText || _info.subject || '';
        var cnBlock = CertificateAdjuster.GetCertName(rawSubject);
        if (!cnBlock) return '';
        return cnBlock.substring(3).trim().replace(/^"|"$/g, '');
    };

    this.getOrganization = function () {
        return this.extractSubjectField('O');
    };

    this.getINN = function () {
        var inn = this.extractSubjectField('ИНН') ||
            this.extractSubjectField('INN') ||
            this.extractSubjectField('1.2.643.3.131.1.1');
        return inn ? inn.replace(/^(CURR|LEGAL)-/, '') : '';
    };

    /** Формирование строки для выпадающих списков (UI) */
    this.getSummary = function () {
        var name = this.getCommonName();
        if (!name) {
            name = this.getOrganization();
        }
        name = name || "Без имени";

        var dateFromStr = _info.validFromDate ? CertificateAdjuster.GetCertDate(_info.validFromDate) : "Не указана";
        var dateToStr = _info.validToDate ? CertificateAdjuster.GetCertDate(_info.validToDate) : "Не указана";

        return name + " (" + dateFromStr.split(' ')[0] + " - " + dateToStr.split(' ')[0] + ")";
    };

    /**
     * Извлекает понятное имя УЦ (Издателя) из строки issuerText.
     * Сначала ищет CN (имя центра), если его нет — O (организацию).
     */
    this.getIssuerName = function () {
        var rawIssuer = _info.issuerText || '';
        if (!rawIssuer) return 'Неизвестный УЦ';

        // CN= (Common Name) УЦ
        var cnBlock = CertificateAdjuster.extract(rawIssuer, 'CN=');
        if (cnBlock) {
            var issuer = cnBlock.substring(3).trim().replace(/^"|"$/g, '');
            var splitIssuer = issuer.split(',')
            return splitIssuer[0]
        }

        // CN нет, ищем O= (Организация УЦ)
        var oBlock = CertificateAdjuster.extract(rawIssuer, 'O=');
        if (oBlock) {
            var org = oBlock.substring(2).trim().replace(/^"|"$/g, '');
            var splitOrg = org.split(',')
            return splitOrg[0]
        }

        return 'Другие УЦ';
    };

};
