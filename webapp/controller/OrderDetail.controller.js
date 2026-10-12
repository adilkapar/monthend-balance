// @ts-nocheck
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageBox",
    "sap/m/MessageToast"
],
function (Controller, MessageBox, MessageToast) {
    "use strict";

    return Controller.extend("ppplanner.controller.OrderDetail", {
        onInit: function () {
            var oComponent = this.getOwnerComponent();
            this.getView().setModel(oComponent.getModel("serviceState"), "serviceState");
            if (oComponent.getModel()) {
                this.getView().setModel(oComponent.getModel());
            }

            // Attach to route matched event
            oComponent.getRouter()
                .getRoute("RouteOrderDetail")
                .attachPatternMatched(this._onRouteMatched, this);
        },

        /**
         * Called when the OrderDetail route is matched.
         * Binds the view to the selected production order with $expand.
         * @param {sap.ui.base.Event} oEvent The route matched event
         */
        _onRouteMatched: function (oEvent) {
            var sOrderNumber = decodeURIComponent(
                oEvent.getParameter("arguments").orderNumber
            );
            var sPath = "/ProductionOrderSet('" + sOrderNumber + "')";

            this.getView().bindElement({
                path: sPath,
                parameters: {
                    expand: "GoodsMovementBalanceSet,ConfirmationSummarySet"
                },
                events: {
                    dataRequested: function () {
                        this.getView().setBusy(true);
                    }.bind(this),
                    dataReceived: function () {
                        this.getView().setBusy(false);
                    }.bind(this)
                }
            });
        },

        /**
         * Navigates back to the production order list.
         */
        onNavBack: function () {
            var oHistory = sap.ui.core.routing.History.getInstance();
            var sPreviousHash = oHistory.getPreviousHash();

            if (sPreviousHash !== undefined) {
                window.history.go(-1);
            } else {
                this.getOwnerComponent().getRouter().navTo("RouteProductionOrder", {}, true);
            }
        },

        /**
         * Sets Technical Complete for the current single order.
         */
        onSetTecoSingle: function () {
            var that = this;
            var oContext = this.getView().getBindingContext();
            if (!oContext) {
                return;
            }

            var sAufnr = oContext.getProperty("Aufnr");
            var oI18n = this.getView().getModel("i18n").getResourceBundle();

            MessageBox.confirm(
                oI18n.getText("tecoConfirmMsg", [1]),
                {
                    title: oI18n.getText("tecoConfirmTitle"),
                    onClose: function (oAction) {
                        if (oAction === MessageBox.Action.OK) {
                            that._executeTeco(sAufnr, oI18n);
                        }
                    }
                }
            );
        },

        /**
         * Executes the SetTechnicalComplete function import.
         * @param {string} sAufnr The order number
         * @param {object} oI18n The resource bundle
         */
        _executeTeco: function (sAufnr, oI18n) {
            var that = this;
            var oModel = this.getOwnerComponent().getModel();
            this.getView().setBusy(true);

            oModel.callFunction("/SetTechnicalComplete", {
                method: "POST",
                urlParameters: { AufnrList: sAufnr },
                success: function (oData) {
                    that.getView().setBusy(false);
                    if (oData.Aufnr !== undefined) {
                        if (oData.Success) {
                            MessageToast.show(oI18n.getText("tecoSuccessMsg", [oData.Aufnr]));
                        } else {
                            MessageBox.error(oI18n.getText("tecoErrorMsg", [oData.Aufnr, oData.MsgText]));
                        }
                    } else {
                        MessageToast.show(oI18n.getText("success"));
                    }
                    // Refresh binding to get updated status
                    that.getView().getElementBinding().refresh(true);
                },
                error: function (oError) {
                    that.getView().setBusy(false);
                    var sMsg = "Error";
                    try {
                        sMsg = JSON.parse(oError.responseText).error.message.value;
                    } catch (e) {
                        sMsg = oError.message || oError.statusText || "Unknown error";
                    }
                    MessageBox.error(sMsg, {
                        title: oI18n.getText("tecoResultTitle")
                    });
                }
            });
        }
    });
});