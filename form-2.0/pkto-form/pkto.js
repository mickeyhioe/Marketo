var Pkto = window.Pkto || {};

Pkto.Cookie = {
    read: function(key) {
        var name = key + "=";
        var ca   = document.cookie.split(';');
        for(var i=0; i<ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0)==' ') c = c.substring(1);
            if (c.indexOf(name) != -1) return c.substring(name.length,c.length);
        }
        return '';
    },
    write: function(key, value, expireDays) {
        var date = new Date();
        date.setTime(date.getTime() + (expireDays*24*60*60*1000));
        document.cookie = key + '=' + value + '; ' + 'expires=' + date.toUTCString();
    }
};

Pkto.Validate = {
    Number: function(value) { if (isNaN(value)) { return "Error. Field is not a number."; } return true; }
};

Pkto.QueryString = {
    get: function(key, url) {
        if (!url) { url = window.location.search; }
        var result = url.match(new RegExp(key + '=(.*?)($|\&)', 'i'));
        if (!result) { return ''; } else { return result[1]; }
    }
};

Pkto.Load = {
    script: function(url, callback) {
        var script  = document.createElement('script');
        script.type = 'text/javascript';
        if (callback) {
            if (script.readyState) {
                script.onreadystatechange = function(){
                    if (script.readyState == "loaded" || script.readyState == "complete"){
                        script.onreadystatechange = null;
                        callback();
                    }
                };
            } else {
                script.onload = function(){
                    callback();
                };
            }
        }

        script.src = url;
        document.getElementsByTagName("head")[0].appendChild(script);
    }
};

Pkto.Form = function(config) {

    this.container = function() {
        return $('#' + config.mktoFormContainer);
    }

    this.initialize = function() {
        config.currentForm = 0;
        if (config.mktoFormIds && config.mktoFormIds.length > 1) {
            var progress         = document.createElement('progress');
            progress.style.width = '100%';
            progress.setAttribute('max', config.mktoFormIds.length);
            progress.setAttribute('value', 0);
            this.container().append(progress);
        }

        this.load();
    };

    this.load = function() {
        var that = this;

        var mktoFormId        = config.mktoFormIds[config.currentForm];
        var mktoFormElementId = 'mktoForm_' + mktoFormId;
        if (config.currentForm > 0) {
            var previousMktoFormId        = config.mktoFormIds[(config.currentForm - 1)];
            var previousMktoFormElementId = 'mktoForm_' + previousMktoFormId;
            var previousMktoForm          = $('#' + previousMktoFormElementId);
            previousMktoForm.remove();
        }

        var form = document.createElement('form');
        form.id  = mktoFormElementId;
        this.container().append(form);

        if (config.beforeReady && typeof config.beforeReady === 'function') {
            config.beforeReady();
        }

        MktoForms2.loadForm('//' + config.mktoInstanceDomain, config.mktoMunchkinId, mktoFormId);
        MktoForms2.whenReady(function(form) {
            form.getFormElem().children('style').remove();
            $('#' + mktoFormElementId).removeAttr('style');
            $('#' + mktoFormElementId + ' *').removeAttr('style');

            if (config.afterReady && typeof config.afterReady === 'function') {
                config.afterReady();
            }

            that.configure(form);
        });

    };

    this.configure = function(form) {
        // Enable Backtracking
        if (true === config.backtracking) {
            var mktoTrk      = Pkto.Cookie.read('_mkto_trk');
            var mktoTrkParts = mktoTrk.match(new RegExp('token:(.*?)($|\&)', 'i'));
            if (mktoTrkParts) { mktoTrk = mktoTrkParts[1]; }
            form.addHiddenFields({'backtrack':mktoTrk});
        }

        // Enable Google UTM Tracking
        if (true === config.utmTracking) {
            form.addHiddenFields({'utm_source':Pkto.QueryString.get('utm_source')});
            form.addHiddenFields({'utm_medium':Pkto.QueryString.get('utm_medium')});
            form.addHiddenFields({'utm_term':Pkto.QueryString.get('utm_term')});
            form.addHiddenFields({'utm_content':Pkto.QueryString.get('utm_content')});
            form.addHiddenFields({'utm_campaign':Pkto.QueryString.get('utm_campaign')});
        }

        // Prevent Tracking
        if (false === config.tracking) {
            form.addHiddenFields({'_mkto_trk':''});
        }

        // Field Defaults
        if (config.defaults) {
            for(defaultee in config.defaults) {
                defaultee = config.defaults[defaultee];
                var element = form.getFormElem().find('#' + defaultee.field);
                element.val(defaultee.value);
                if (defaultee.readOnly) { element.prop('readonly', defaultee.readOnly); }
            }
        }

        // Field Hints
        if (config.hinting) {
            for(hintee in config.hinting) {
                hintee      = config.hinting[hintee];
                var element = form.getFormElem().find('#' + hintee.field);
                element.prop('hint', hintee.text);
                element.focus(function() {
                    if($(this).val() == $(this).prop('hint')){
                        $(this).val('');
                        $(this).css('color', '');
                    }
                });
                element.blur(function() {
                    if($(this).val() == '' && $(this).prop('hint') != '') {
                        $(this).val($(this).prop('hint'));
                        $(this).css('color', '#AAAAAA');
                    }
                });
                element.blur();
            }
        }

        // Custom Validation
        form.onValidate(function() {
            if (config.validation) {
                for(validatee in config.validation) {
                    validatee  = config.validation[validatee];
                    var result = Pkto.Validate[validatee.type](form.vals()[validatee.field]);
                    if (true !== result) {
                        form.submitable(false);
                        if (!validatee.message) { validatee.message = result; }
                        form.showErrorMessage(validatee.message, form.getFormElem().find('#' + validatee.field));
                    }
                }
            }
        });

        form.onSubmit(function(form){
            // Prevent Tracking
            if (false === config.tracking) {
                form.vals({'_mkto_trk':''});
            }
        });

        var that = this;
        form.onSuccess(function() {
            config.currentForm++;
            that.container().children('progress')[0].setAttribute('value', (config.mktoFormIds.length - (config.mktoFormIds.length - config.currentForm)));
            if (config.currentForm == config.mktoFormIds.length) {
                // Custom Success Message
                if (config.successMessage) {
                    var successElement = $("<p>" + config.successMessage + "</p>");
                    var formElement    = form.getFormElem();
                    formElement.hide();
                    successElement.fadeIn().insertBefore(formElement);
                    return false;
                }
            } else {
                that.load();
                return false;
            }

        });

        this.finalize();
    };

    this.finalize = function() {};

    var that = this;
    Pkto.Load.script('//' + config.mktoInstanceDomain + '/js/forms2/js/forms2.js', function() {
        Pkto.Load.script('//munchkin.marketo.net/munchkin.js', function() {
            Pkto.Load.script('//ajax.googleapis.com/ajax/libs/jquery/2.1.1/jquery.min.js', function() {
                that.initialize();
            });
        });
    });

};

window.Pkto = Pkto;