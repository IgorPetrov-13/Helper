/** Флаг отмены дефолтного окна ошибки в firefox*/
window.cadesplugin_skip_extension_install = true;
// TODO для теста уменьшил таймаут
window.cadesplugin_load_timeout = 5500;

/** Статусы для расширения, плагина и CSP. Хранит только булевы значения */
var cadesComponentsExistence = {
    extension: null,
    plugin: null,
    csp: null,
};
/** Функция для установки флага наличия расширения
 * (пришлось вынести, тк расширение может отработать раньше загрузки этого файла)
 */
window.cadesplugin_extension_loaded_callback = function () {
    cadesComponentsExistence.extension = true;
};

CadesAsync = function () {

    /** Версии установленных расширения, плагина и CSP. */
    var _componentsVersion = {
        extension: null,
        plugin: null,
        csp: null,
    };

    // флаг инициализации (для предотвращения повторной инициализации)
    var _initPromise = null;

    // флаг загрузки (initCadesPlugin)
    this.isLoaded = false;
    // текущий контекст
    var self = this;

    /** Безопасное получение актуального объекта плагина */
    function getPlugin() {
        return window.cadesplugin;
    }

    /** Подключение нативного файла cadesplugin_api.js
     * @return {Promise<unknown>}
     */
    function loadCadesPlugin() {
        return new Promise(function (resolve, reject) {
            if (getPlugin()) {
                return resolve();
            }
            var script = document.createElement('script');
            script.type = 'text/javascript';
            script.src = '/js/cprocsp/cadesplugin_api.js';
            script.onload = function () {
                resolve();
            };
            script.onerror = function () {
                reject('Не удалось загрузить файл cadesplugin_api.js');
            };
            document.head.appendChild(script);
        });
    }

    /** Результат работы cadesplugin_api.js
     *
     * @return {Promise<unknown>}
     */
    function waitForCadesPlugin() {
        return new Promise(function (resolve, reject) {
            var plugin = getPlugin();

            // загружен ли объект cadesplugin
            if (!plugin) {
                return reject('Скрипт cadesplugin_api.js не подключен');
            }

            // плагин - это Promise (cadesplugin_api)
            if (typeof plugin.then === 'function') {
                // обрабатываем и успех и ошибку в блоке then, тк это Thenable-объект
                plugin.then(
                    function () {
                        // проверяем, что объект инициализировался, тк после resolve в cadesplugin_api.js нужно еще время
                        var checkAttempts = 0;

                        function pluginChecking() {
                            checkAttempts++

                            plugin.CreateObjectAsync('CAdESCOM.About')
                                .then(function (aboutObj) {
                                    resolve();// Сработает, когда в cadesplugin_api.js выполнится plugin_loaded()
                                })
                                .catch(function (err) {
                                    if (checkAttempts < 10) {
                                        setTimeout(pluginChecking, 200)
                                    } else {
                                        self.setComponentsExistence(false, "extension");
                                        reject('Плагин недоступен');
                                    }
                                })
                        }

                        // Запускаем первую проверку
                        setTimeout(pluginChecking, 100);
                    },
                    function (err) {
                        reject(err) // Сработает при вызове plugin_loaded_error() или check_load_timeout()
                    }
                );
            } else {
                // для IE/ActiveX
                if (plugin.CreateObject) {
                    resolve();
                } else {
                    reject('Не удалось инициализировать ActiveX объект КриптоПро');
                }
            }
        });
    }

    /** Процесс и обработка ошибок
     *
     * @return {Promise<boolean | *>}
     */
    function initializationProcess() {

        return loadCadesPlugin()
            .then(function () {
                return waitForCadesPlugin()
            })
            .then(function () {
                // на этом этапе значит есть плагин и расширение
                self.setComponentsExistence(true, "extension");
                self.setComponentsExistence(true, "plugin");

                self.isLoaded = true;

                _initPromise = null; //TODO Очищаем, так как теперь isLoaded = true

                return true;
            })

            .catch(function (error) {
                self.isLoaded = false;
                _initPromise = null;

                console.log("ДО getErrorMessage===", error)
                // получаем строку с ошибкой
                return self.getErrorMessage(error)
                    // обрабатываем ошибку
                    .then(function (errObj) {
                        // Внутрь этого then прилетит уже готовая строка, а не Promise
                        throw errObj
                        //console.log("ПОСЛЕ getErrorMessage===", errObj, typeof errObj)
                        // var extendedError = new Error(errObj.message);
                        // extendedError.code = errObj.code;
                        // console.log("extendedError===", extendedError)
                        // throw extendedError;

                        // в cadesplugin_api.js ошибка расширения приходит именно с таким ответом
                        // if (errorStr.indexOf('Плагин недоступен') !== -1) {
                        //     cadesComponentsExistence.extension = false;
                        // } else if (errorStr.indexOf('Истекло время ожидания загрузки плагина') !== -1) {
                        //     // отсутствие установленного плагина приходит по завершению таймаута (в firefox так же может быть и расширение из-за особенностей браузера)
                        //     cadesComponentsExistence.plugin = false;
                        // } else {
                        //     cadesComponentsExistence.extension = false;
                        //     cadesComponentsExistence.plugin = false;
                        // }

                        // console.error("КриптоПро ошибка:", errorStr);

                        // throw new Error(errorStr);
                        // throw (error)
                    });
            })
    }

    /** Запуск
     * @return {null|Promise<boolean|*>|Promise<boolean>}
     */
    this.initCadesPlugin = function () {
        // уже загружен - выходим
        if (self.isLoaded) {
            return Promise.resolve(true);
        }
        // в процессе загрузки - вернем текущий promise выполнения
        if (_initPromise) {
            return _initPromise;
        }
        _initPromise = initializationProcess();

        return _initPromise;
    }

    /**
     * Проверка состояния компонентов КриптоПро
     * @param {boolean} [shouldThrow=false] - Если true, выбрасывает Error при отсутствии компонента
     * @returns {Object} Копия объекта статусов компонентов
     */
    this.checkComponents = function (shouldThrow) {
        var needValidation = shouldThrow || false;

        if (needValidation) {
            if (!cadesComponentsExistence.extension) {
                throw new Error('Недоступно расширение для браузера');
            }
            if (!cadesComponentsExistence.plugin) {
                throw new Error('Недоступен CAdES плагин');
            }
            if (!cadesComponentsExistence.csp) {
                throw new Error('Недоступен провайдер Крипто Про CSP');
            }
        }

        // вернем копию
        return {
            extension: cadesComponentsExistence.extension,
            plugin: cadesComponentsExistence.plugin,
            csp: cadesComponentsExistence.csp
        };
    }

    /** Получение версий установленных расширения, плагина и CSP. */
    this.getComponentsVersion = function () {
        var plugin = window.cadesplugin;
        if (!plugin) {
            return Promise.reject(new Error('Плагин КриптоПро не инициализирован'));
        }

        // версия есть - вернем значение
        if (_componentsVersion.plugin && _componentsVersion.csp && _componentsVersion.extension) {
            return Promise.resolve(_componentsVersion)
        }

        var oAbout = null;
        var pCspVer = null;
        var pVer = null;

        // расширение с защитой от зависания
        var getExtensionVersionPromise = new Promise(function (resolve) {
            var isResolved = false;

            var timeout = setTimeout(function () {
                if (!isResolved) {
                    isResolved = true
                    resolve()
                }
            }, 1000)
            if (plugin && typeof plugin.get_extension_version === 'function') {
                plugin.get_extension_version(function (value) {
                    clearTimeout(timeout);
                    if (!isResolved) {
                        _componentsVersion.extension = value;
                        isResolved = true
                        resolve();
                    }
                });
            } else {
                clearTimeout(timeout);
                resolve();
            }
        });


        return getExtensionVersionPromise
            .then(function () {
                // создаем объект About
                return plugin.CreateObjectAsync('CAdESCOM.About');
            })
            .then(function (aboutObject) {
                // CSP
                oAbout = aboutObject;
                return oAbout.CSPVersion("", 80);
            })
            .then(function (cspVersionObject) {
                pCspVer = cspVersionObject;
                return pCspVer.MajorVersion;
            })
            .then(function (cspMajor) {
                _componentsVersion.csp = {major: cspMajor, minor: null, build: null};
                return pCspVer.MinorVersion;
            })
            .then(function (cspMinor) {
                _componentsVersion.csp.minor = cspMinor;
                return pCspVer.BuildVersion;
            })
            .then(function (cspBuild) {
                _componentsVersion.csp.build = cspBuild;
                // плагин
                return oAbout.PluginVersion;
            })
            .then(function (pluginVersionObject) {
                pVer = pluginVersionObject;
                return pVer.MajorVersion;
            })
            .then(function (pluginMajor) {
                _componentsVersion.plugin = {major: pluginMajor, minor: null, build: null};
                return pVer.MinorVersion;
            })
            .then(function (pluginMinor) {
                _componentsVersion.plugin.minor = pluginMinor;
                return pVer.BuildVersion;
            })
            .then(function (pluginBuild) {
                _componentsVersion.plugin.build = pluginBuild;
                // удаление
                return plugin.ReleasePluginObjects();
            })
            .then(function () {
                // вернем объект с версиями
                return _componentsVersion;
            })
            .catch(function (error) {
                // очищаем объекты
                if (plugin && typeof plugin.ReleasePluginObjects === "function") {
                    plugin.ReleasePluginObjects();
                }

                // обрабатываем ошибку
                return self.getErrorMessage(error)
                    .then(function (errorStr) {
                        throw new Error(errorStr);
                    });
            });
    }

    /**
     * Последовательная обработка списка хранилищ
     * @param {Array} storesList - Список объектов {location, name}
     * @returns {Promise<Array>} Массив уникальных объектов сертификатов
     */
    function getCertsFromStoreArr(storesList) {
        var result = [];
        var uniqueThumbs = {};

        if (!storesList || !storesList.length) {
            return Promise.resolve(result);
        }

        function processStoreAt(arrIndex) {
            if (arrIndex >= storesList.length) {
                return Promise.resolve(result);
            }

            var currStore = storesList[arrIndex];

            return extractStoreCerts(currStore.location, currStore.name)
                .then(function (certs) {

                    if (certs && certs.length) {
                        for (var i = 0; i < certs.length; i++) {
                            var cert = certs[i];
                            var thumb = null;

                            if (typeof cert.getThumbprint === 'function') {
                                thumb = cert.getThumbprint();
                            } else if (cert.thumbprint) {
                                thumb = cert.thumbprint;
                            } else {
                                console.error('Не удалось получить отпечаток сертификата:', cert);
                                continue;
                            }


                            if (!uniqueThumbs[thumb]) {
                                uniqueThumbs[thumb] = true;
                                result.push(cert);
                            }
                        }
                    }

                    return processStoreAt(arrIndex + 1);
                })
                .catch(function (error) {
                    console.error(`Ошибка в хранилище ${currStore.name}:`, error);

                    if (window.cadesplugin && typeof window.cadesplugin.ReleasePluginObjects === "function") {
                        window.cadesplugin.ReleasePluginObjects();
                    }

                    return self.getErrorMessage(error)
                        .then(function (errorStr) {
                            console.error('Детали ошибки:', errorStr);
                            // Продолжаем со следующим хранилищем
                            return processStoreAt(arrIndex + 1);
                        });
                });
        }

        return processStoreAt(0);
    }

    /** Получение сертификатов из локального хранилища
     * @return {Promise<unknown>}
     */
    this.getFastStoreCerts = function () {
        var plugin = getPlugin();
        if (!plugin) return Promise.reject(new Error('Плагин не инициализирован'));
        // хранилища
        var certFastStores = [
            {location: plugin.CAPICOM_MEMORY_STORE, name: plugin.CAPICOM_MY_STORE},
            {location: plugin.CAPICOM_CURRENT_USER_STORE, name: plugin.CAPICOM_MY_STORE}
        ];

        return Promise.resolve()
            .then(function () {
                return getCertsFromStoreArr(certFastStores);
            })
    }

    /** Получение сертификатов из хранилища контейнера
     * @return {Promise<unknown>}
     */
    this.getSlowStoreCerts = function () {
        var plugin = getPlugin();
        if (!plugin) return Promise.reject(new Error('Плагин не инициализирован'));

        var certSlowStores = [
            {location: plugin.CAPICOM_SMART_CARD_USER_STORE, name: plugin.CAPICOM_MY_STORE},
            { location: plugin.CADESCOM_CONTAINER_STORE, name: "" }
        ];

        return Promise.resolve()
            .then(function () {
                return getCertsFromStoreArr(certSlowStores);
            })
    }

    /**
     * Извлечение сертификатов из конкретного хранилища
     * @param {number} storeLocation - Числовой код локации (например, 1 или 2)
     * @param {string} name - Имя хранилища (например, "My")
     * @returns {Promise<Array>}
     */
    function extractStoreCerts(storeLocation, name) {
        var oStore = null
        var plugin = getPlugin();

        if (!plugin) {
            return Promise.reject(new Error('Плагин КриптоПро не инициализирован'));
        }

        return plugin.CreateObjectAsync('CAdESCOM.Store')
            .then(function (storeObject) {
                oStore = storeObject;
                // параметры StoreLocation, StoreName, OpenMode
                return oStore.Open(storeLocation, name, plugin.CAPICOM_STORE_OPEN_MAXIMUM_ALLOWED);
            })
            .then(function () {
                self.setComponentsExistence(true, "csp");
                return oStore.Certificates;
            })
            .then(function (certificateCollection) {
                var storeCerts = certificateCollection;
                var certsPool = [];
                console.log("certsPool", certsPool);

                // получаем количество сертификатов
                return storeCerts.Count
                    .then(function (count) {
                        var certCount = count;

                        function fetchCertificateAt(idx) {
                            if (idx > certCount) {
                                return Promise.resolve(certsPool); // все обработаны
                            }

                            // начальные состояния
                            var currentCert = null;
                            var tmpCert = {
                                serialNumber: null,
                                thumbprint: null,
                                subjectText: null,
                                issuerText: null,
                                validFromDate: null,
                                validToDate: null,
                                isValid: false,
                                hasPrivKey: false,
                                content: null
                            };

                            return storeCerts.Item(idx)
                                .then(function (certObject) {
                                    currentCert = certObject;
                                    console.log("certObject", certObject);
                                    return currentCert.SerialNumber;
                                })
                                .then(function (serial) {
                                    tmpCert.serialNumber = serial;
                                    return currentCert.Thumbprint;
                                })
                                .then(function (thumb) {
                                    tmpCert.thumbprint = thumb;
                                    return currentCert.SubjectName;
                                })
                                .then(function (subject) {
                                    tmpCert.subjectText = subject;
                                    return currentCert.IssuerName;
                                })
                                .then(function (issuer) {
                                    tmpCert.issuerText = issuer;
                                    return currentCert.ValidFromDate;
                                })
                                .then(function (fromDate) {
                                    tmpCert.validFromDate = new Date(fromDate);
                                    return currentCert.ValidToDate;
                                })
                                .then(function (toDate) {
                                    tmpCert.validToDate = new Date(toDate);

                                    // сравниваем даты
                                    var nowDt = new Date();
                                    if (tmpCert.validFromDate < nowDt && nowDt < tmpCert.validToDate) {
                                        // даты в порядке - смотрим проверку у плагина
                                        return currentCert.IsValid()
                                            .then(function (isValidObject) {
                                                return isValidObject.Result;
                                            })
                                            .then(function (result) {
                                                console.log("result", result);
                                                tmpCert.isValid = result;
                                            })
                                            .catch(function () {
                                                tmpCert.isValid = false;
                                            });
                                    } else {
                                        tmpCert.isValid = false;
                                        return Promise.resolve();
                                    }
                                })
                                .catch(function (error) {
                                    tmpCert.subjectText = 'Ошибка чтения данных сертификата';
                                    console.error('Не удалось получить информацию по сертификату #' + idx + '; из хранилища #' + name, error);
                                })
                                .then(function () {
                                    // наличие закрытого ключа
                                    return currentCert.HasPrivateKey()
                                        .then(function (hasKey) {
                                            tmpCert.hasPrivKey = hasKey;
                                        })
                                        .catch(function (e) {
                                            console.error('Отсутствует закрытый ключ у сертификата #' + idx + '; из хранилища #' + name, e);
                                            tmpCert.hasPrivKey = false;
                                        });
                                })
                                .then(function () {
                                    // Base64-содержимое (0 = CAPICOM_ENCODE_BASE64)
                                    return currentCert.Export(0)
                                        .then(function (base64Content) {
                                            tmpCert.content = base64Content;
                                        })
                                        .catch(function (e) {
                                            console.error('Экспорт содержимого невозможен для сертификата #' + idx + '; из хранилища #' + name, e);
                                            tmpCert.content = null;
                                        });
                                })
                                .then(function () {
                                    try {
                                        // используем класс Certificate и добавляем в certsPool
                                        if (typeof Certificate === "function") {
                                            certsPool.push(new Certificate(tmpCert, {
                                                name: name,
                                                location: storeLocation
                                            }));
                                            console.log('Сертификат добавлен в пул:', tmpCert);
                                        } else {
                                            console.warn('Certificate не функция, добавляем сырые данные');
                                            certsPool.push(tmpCert);
                                        }
                                    } catch (e) {
                                        console.error('Ошибка создания Certificate:', e);
                                        certsPool.push(tmpCert);
                                    }

                                    // переход к следующему сертификату
                                    return fetchCertificateAt(idx + 1);
                                })
                                .catch(function (itemError) {
                                    console.error('Критический сбой при обработке элемента #' + idx, itemError);
                                    return fetchCertificateAt(idx + 1); // continue
                                });
                        }
                        // Запускаем рекурсию
                        return fetchCertificateAt(1);
                    });
            })
            .then(function (certsPool) {
                // Закрытие хранилища и возврат сертификатов
                if (oStore && typeof oStore.Close === 'function') {
                    return oStore.Close().then(function () {
                        return certsPool;
                    });
                }
                return certsPool;
            })
            .catch(function (storeError) {
                // Закрытие хранилища при ошибке
                console.error('Ошибка при работе с хранилищем:', storeError);

                if (oStore && typeof oStore.Close === 'function') {
                    try {
                        oStore.Close();
                    } catch (e) {
                        console.error('Ошибка закрытия хранилища:', e);
                    }
                }
                throw storeError;
            });
    }

    /**
     * Установка состояния компонентов КриптоПро.
     * @param {boolean|null} status - устанавливаемое значение (true, false или null)
     * @param {'extension'|'plugin'|'csp'} [component] - имя конкретного компонента ('extension', 'plugin', 'csp')
     */
    this.setComponentsExistence = function(status, component) {
        if (typeof cadesComponentsExistence === 'undefined') {
            return;
        }

        // Определяем статус
        var finalStatus = (status === null) ? null : !!status;

        // Если компонент не указан, то применяем для всех
        if (!component) {
            cadesComponentsExistence.extension = finalStatus;
            cadesComponentsExistence.plugin = finalStatus;
            cadesComponentsExistence.csp = finalStatus;

            // Сбросим флаг загрузки в этом случае, что бы процесс инициализации тоже перезапустился
            if (status === null) {
                self.isLoaded = false;
            }
        } else if (component === "extension") {
            cadesComponentsExistence.extension = finalStatus;
        } else if (component === "plugin") {
            cadesComponentsExistence.plugin = finalStatus;
        } else if (component === "csp") {
            cadesComponentsExistence.csp = finalStatus;
        }
    };


    /**
     * Поиск конкретного сертификата в хранилище по его отпечатку
     * @param {string} thumbprint - SHA1 отпечаток искомого сертификата
     * @param {Object} store - Объект конфигурации хранилища {location: number, name: string}
     * @returns {Promise<Object>} Системный COM-объект найденного сертификата КриптоПро
     */
    this.findStoredCert = function (thumbprint, store) {
        if (!store || !store.location || !store.name) {
            return Promise.reject(new Error('Некорректные параметры хранилища'));
        }

        var oStore = null;
        var needleCert = null;
        var plugin = getPlugin();

        if (!plugin) {
            return Promise.reject(new Error('Плагин КриптоПро не инициализирован'));
        }

        return plugin.CreateObjectAsync('CAdESCOM.Store')
            .then(function (storeObject) {
                oStore = storeObject;
                return oStore.Open(store.location, store.name, plugin.CAPICOM_STORE_OPEN_MAXIMUM_ALLOWED);
            })
            .then(function () {
                return oStore.Certificates;
            })
            .then(function (storeCerts) {

                return storeCerts.Find(plugin.CAPICOM_CERTIFICATE_FIND_SHA1_HASH, thumbprint);
            })
            .then(function (foundCerts) {
                return foundCerts.Count
                    .then(function (certsCount) {
                        if (certsCount === 0) {
                            throw new Error("Сертификат с отпечатком [" + thumbprint + "] не найден в хранилище " + store.name);
                        }
                        // нумерация элементов начинается с 1
                        return foundCerts.Item(1);
                    });
            })
            .then(function (certObject) {
                needleCert = certObject;
                // закрываем хранилище перед возвратом результата
                if (oStore && typeof oStore.Close === 'function') {
                    return oStore.Close();
                }
            })
            .then(function () {
                // вернем нативный объект сертификата КриптоПро наружу
                return needleCert;
            })
            .catch(function (error) {
                var closePromise = (oStore && typeof oStore.Close === 'function')
                    ? oStore.Close().catch(function (e) {
                        console.error('Ошибка закрытия в catch:', e);
                    })
                    : Promise.resolve();

                // обрабатываем ошибку
                return closePromise
                    .then(function () {
                        return self.getErrorMessage(error);
                    })
                    .then(function (errorStr) {
                        throw new Error(errorStr);
                    });
            });
    };

    /**
     * Создание электронной подписи для текстового сообщения
     * Формирует присоединенную подпись в формате CAdES-BES
     * @param {string} message - Исходный текст для подписания
     * @param {string} thumbprint - SHA1-отпечаток сертификата подписанта
     * @param {Object} [store=null] - Конфигурация хранилища {location: number, name: string}
     * @returns {Promise<string>} Строка готовой подписи в формате CMS/CAdES (Base64)
     */
    this.createMessageSign = function (message, thumbprint, store) {
        var plugin = getPlugin();
        if (!plugin) {
            return Promise.reject(new Error('Плагин КриптоПро не инициализирован'));
        }
        var currentStore = store;
        if (!store || !store.name || !store.location) {
            currentStore = {
                name: (store && store.name) || plugin.CAPICOM_MY_STORE,
                location: (store && store.location) || plugin.CAPICOM_CURRENT_USER_STORE
            }
        }

        var oSigner = null;
        var oSignedData = null;
        var finalSignature = "";


        return Promise.resolve()
            .then(function () {
                // объект сертификата КриптоПро
                return self.findStoredCert(thumbprint, currentStore);
            })
            .then(function (oWorkCert) {
                // объект Подписанта
                return plugin.CreateObjectAsync('CAdESCOM.CPSigner')
                    .then(function (signerObject) {
                        oSigner = signerObject;
                        return oSigner.propset_Certificate(oWorkCert);
                    });
            })
            .then(function () {
                //  объект процессора криптографии CadesSignedData
                return plugin.CreateObjectAsync('CAdESCOM.CadesSignedData')
                    .then(function (signedDataObject) {
                        oSignedData = signedDataObject;
                        return oSignedData.propset_Content(message);
                    });
            })
            .then(function () {
                //  Формируем подпись.
                // oSigner: объект настроенного подписанта
                // 1: константа CADESCOM_CADES_BES
                // false: флаг отсоединенной подписи
                return oSignedData.SignCades(oSigner, plugin.CADESCOM_CADES_BES, false);
            })
            .then(function (signatureResult) {
                finalSignature = signatureResult;
                return finalSignature;
                // очищаем память
                //return plugin.ReleasePluginObjects();
            })
            .catch(function (error) {
                return self.getErrorMessage(error)
                    .then(function (errorStr) {
                        throw new Error(errorStr);
                    });
            });
    }

    /**
     * Перевод ошибки из десятичной в шестнадцатеричную систему
     * @param number
     * @return {string}
     */
    this.decToHex = function (number) {
        return (number >>> 0).toString(16).toUpperCase();
    }

    /**
     * Функция обработки ошибок
     * @param error
     * @return {Promise<{code: string, message: string}>|Promise<{code: string, message}>|*}
     */
    this.getErrorMessage = function (error) {
        if (!error) {
            return Promise.resolve({code: 'UNKNOWN', message: "Неизвестная ошибка"});
        }

        var plugin = window.cadesplugin;
        var errMessage = error.message || "Неизвестная ошибка";
        console.log("errMessage>>", errMessage)
        var errCode = 'CRYPTO_ERROR'; // Дефолтный код для ошибок подписи/шифрования

        // Вспомогательная функция для форматирования
        function formatResult(msg) {
            var finalMsg = msg;
            if (error && error.number) {
                finalMsg += ' (0x' + self.decToHex(error.number) + ')';
            }
            // определяем тип ошибки по тексту КриптоПро и выставляем код
            if (finalMsg.indexOf('Плагин недоступен') !== -1 || finalMsg.indexOf('Extension') !== -1) {
                errCode = 'NO_EXTENSION'; // расширение
                finalMsg = 'Расширение для браузера отсутствует'
            } else if (finalMsg.indexOf('время ожидания загрузки плагина') !== -1 || finalMsg.indexOf('не подключен') !== -1) {
                // в Мозиле это может быть как плагин, так и расширение
                errCode = 'NO_PLUGIN'; // плагин
                finalMsg = 'Плагин не установлен'
            } else if (finalMsg.indexOf('CAdESCOM.About') !== -1 || finalMsg.indexOf('0x800401F3') !== -1) {
                // 0x800401F3 - невозможно создать COM-объект, значит нет CSP
                errCode = 'NO_CSP';// CSP
                finalMsg = 'CSP отсутствует'
            }

            return {
                code: errCode,
                message: finalMsg
            };
        }

        // Если пришла готовая строка
        if (typeof error === 'string') {
            return Promise.resolve().then(function () {
                return formatResult(error)
            })
        }

        if (typeof error === 'object') {
            if (plugin && typeof plugin.getLastError === "function") {
                try {
                    var lastErrorResult = plugin.getLastError();

                    if (lastErrorResult && typeof lastErrorResult.then === 'function') {
                        return lastErrorResult
                            .then(function (lastErrorMsg) {
                                return formatResult(lastErrorMsg || errMessage);
                            })
                            .catch(function () {
                                return formatResult(errMessage);
                            });
                    }

                    return Promise.resolve(formatResult(lastErrorResult || errMessage));
                } catch (e) {
                    return Promise.resolve(formatResult(errMessage));
                }
            }
            return Promise.resolve(formatResult(errMessage));
        }

        return Promise.resolve({code: 'UNKNOWN', message: String(error)});
    };

    /**
     * Расшифрование данных, зашифрованных в адрес владельца сертификата
     * Использует объект CAdESCOM.CPEnvelopedData
     * @param {string} dataToDecrypt - Зашифрованные данные (Base64)
     * @param {string} thumbprint - Отпечаток сертификата для поиска ключа
     * @param {Object} [store] - Настройки хранилища
     * @returns {Promise<string>} Расшифрованная строка текста
     */
    this.decrypt = function (dataToDecrypt, thumbprint, store) {
        var plugin = window.cadesplugin;
        if (!plugin) {
            return Promise.reject(new Error('Плагин КриптоПро не инициализирован'));
        }

        var currentStore = store;
        if (!currentStore || !currentStore.location || !currentStore.name) {
            currentStore = {
                location: (store && store.location) ? store.location : plugin.CAPICOM_CURRENT_USER_STORE,
                name: (store && store.name) ? store.name : plugin.CAPICOM_MY_STORE
            };
        }

        // очистка отпечатка
        var cleanThumbprint = String(thumbprint).replace(/\s/g, '').toUpperCase();

        var oEnvelop = null;
        var decryptedContent = "";

        return Promise.resolve()
            .then(function () {
                // ищем сертификат в указанном хранилище
                return self.findStoredCert(cleanThumbprint, currentStore);
            })
            .then(function (certificateObject) {
                // Сертификат успешно найден в системе.
                // Создаем асинхронный объект CPEnvelopedData
                return plugin.CreateObjectAsync("CAdESCOM.CPEnvelopedData");
            })
            .then(function (envelopObject) {
                oEnvelop = envelopObject;

                // 1 = CADESCOM_BASE64_TO_BINARY.
                return oEnvelop.propset_ContentEncoding(plugin.CADESCOM_BASE64_TO_BINARY);
            })
            .then(function () {
                // передаем зашифрованный пакет
                return oEnvelop.Decrypt(dataToDecrypt);
            })
            .then(function () {
                // Извлекаем расшифрованный чистый текст (строку)
                return oEnvelop.Content;
            })
            .then(function (content) {
                decryptedContent = content;
                // Возвращаем результат наружу
                return decryptedContent;
            })
            .catch(function (error) {
                // Обрабатываем ошибку
                return self.getErrorMessage(error)
                    .then(function (errorStr) {
                        throw new Error("Ошибка дешифрования данных: " + errorStr);
                    });
            });
    };
};

window.cadesService = new CadesAsync();