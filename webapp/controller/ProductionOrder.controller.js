sap.ui.define([
    "sap/ui/core/mvc/Controller"
],
function (Controller) {
    "use strict";

    return Controller.extend("ppplanner.controller.ProductionOrder", {
        onInit: function () {
            var oComponent = this.getOwnerComponent();
            this.getView().setModel(oComponent.getModel("serviceState"), "serviceState");
            if (oComponent.getModel()) {
                this.getView().setModel(oComponent.getModel());
            } else {
                oComponent.getModel("serviceState").setProperty("/serviceError", true);
            }
        },

        onRefresh: function () {
            var oComponent = this.getOwnerComponent();
            var oModel = oComponent.getModel();
            if (oModel) {
                oComponent.getModel("serviceState").setProperty("/serviceError", false);
                oModel.refresh(true);
            } else {
                oComponent.getModel("serviceState").setProperty("/serviceError", true);
            }
        }
    });
});
