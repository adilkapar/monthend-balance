/**
 * eslint-disable @sap/ui5-jsdocs/no-jsdoc
 */

sap.ui.define([
        "sap/ui/core/UIComponent",
        "sap/ui/Device",
        "sap/ui/model/json/JSONModel",
        "ppplanner/model/models"
    ],
    function (UIComponent, Device, JSONModel, models) {
        "use strict";

        return UIComponent.extend("ppplanner.Component", {
            metadata: {
                manifest: "json"
            },

            /**
             * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
             * @public
             * @override
             */
            init: function () {
                // call the base component's init function
                UIComponent.prototype.init.apply(this, arguments);

                var oServiceStateModel = new JSONModel({
                    serviceError: false
                });
                this.setModel(oServiceStateModel, "serviceState");

                var oModel = this.getModel();
                if (oModel) {
                    this._onServiceRequestFailed = function () {
                        oServiceStateModel.setProperty("/serviceError", true);
                    };
                    this._onServiceRequestCompleted = function (oEvent) {
                        if (oEvent.getParameter("success")) {
                            oServiceStateModel.setProperty("/serviceError", false);
                        }
                    };

                    oModel.attachRequestFailed(this._onServiceRequestFailed);
                    oModel.attachMetadataFailed(this._onServiceRequestFailed);
                    oModel.attachRequestCompleted(this._onServiceRequestCompleted);
                } else {
                    oServiceStateModel.setProperty("/serviceError", true);
                }

                // enable routing
                this.getRouter().initialize();

                // set the device model
                this.setModel(models.createDeviceModel(), "device");
            },

            destroy: function () {
                var oModel = this.getModel();
                if (oModel && this._onServiceRequestFailed) {
                    oModel.detachRequestFailed(this._onServiceRequestFailed);
                    oModel.detachMetadataFailed(this._onServiceRequestFailed);
                    oModel.detachRequestCompleted(this._onServiceRequestCompleted);
                }
                UIComponent.prototype.destroy.apply(this, arguments);
            }
        });
    }
);