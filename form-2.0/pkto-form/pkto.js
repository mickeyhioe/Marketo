var Pkto = window.Pkto || {};

Pkto.Form = function(config) {

    this.initialize = function() {
        if (config.beforeReady && typeof config.beforeReady === 'function') {
            config.beforeReady();
        }

        this.load();
    };

    this.load = function() {
        var that = this;
        MktoForms2.loadForm(config.mktoFormBaseUrl, config.mktoMunchkinId, config.mktoFormId);
        MktoForms2.whenReady(function(form) {

            if (config.afterReady && typeof config.afterReady === 'function') {
                config.afterReady();
            }

            that.configure(form);
        });
    };

    this.configure = function(form) {

        // Prevent Tracking
        if (false === config.notracking) {
            form.addHiddenFields({'_mkto_trk':''});
        }

        form.onSubmit(function(form){
            // Prevent Tracking
            if (false === config.notracking) {
                form.vals({'_mkto_trk':''});
            }
        });

        form.onSuccess(function() {
            // Custom Success Message
            if (config.successMessage) {
                var successElement = $("<p>" + config.successMessage + "</p>");
                var formElement    = form.getFormElem();
                formElement.hide();
                successElement.fadeIn().insertBefore(formElement);
                return false;
            }

        });

        this.finalize();
    };

    this.finalize = function() {};

    this.initialize();
};

window.Pkto = Pkto;

