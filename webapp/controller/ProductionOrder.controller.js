// @ts-nocheck
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageBox",
    "sap/m/MessageToast"
],
function (Controller, Filter, FilterOperator, MessageBox, MessageToast) {
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
            // Table starts empty — suspend the items binding until user presses Go
            var oTable = this.byId("productionOrdersTable");
            var fnSuspend = function () {
                var oBinding = oTable.getBinding("items");
                if (oBinding) {
                    oBinding.suspend();
                }
            };
            // Binding may already be created or may come after model propagation
            if (oTable.getBinding("items")) {
                oTable.getBinding("items").suspend();
            } else {
                oTable.attachEventOnce("updateFinished", fnSuspend);
            }
        },

        /**
         * Builds OData filters from the filter bar and binds the table.
         */
        onSearch: function () {
            var aFilters = this._buildFilters();
            this._applyFilters(aFilters);
        },

        /**
         * Reads all filter controls and returns an array of sap.ui.model.Filter.
         * @returns {sap.ui.model.Filter[]} The filter array
         */
        _buildFilters: function () {
            var aFilters = [];
            var oView = this.getView();

            // --- String filters (Contains for text, EQ for codes) ---
            var aStringFilters = [
                { id: "filterAufnr", field: "Aufnr", operator: FilterOperator.Contains },
                { id: "filterAuart", field: "Auart", operator: FilterOperator.EQ },
                { id: "filterWerks", field: "Werks", operator: FilterOperator.EQ },
                { id: "filterMatnr", field: "Matnr", operator: FilterOperator.Contains },
                { id: "filterMatkl", field: "Matkl", operator: FilterOperator.EQ },
                { id: "filterMtart", field: "Mtart", operator: FilterOperator.EQ },
                { id: "filterDispo", field: "Dispo", operator: FilterOperator.EQ },
                { id: "filterFevor", field: "Fevor", operator: FilterOperator.EQ },
                { id: "filterArbpl", field: "Arbpl", operator: FilterOperator.Contains },
                { id: "filterLgort", field: "Lgort", operator: FilterOperator.EQ },
                { id: "filterCharg", field: "Charg", operator: FilterOperator.Contains },
                { id: "filterPsPspPnr", field: "PsPspPnr", operator: FilterOperator.Contains }
            ];

            aStringFilters.forEach(function (oConf) {
                var sValue = oView.byId(oConf.id).getValue().trim();
                if (sValue) {
                    aFilters.push(new Filter(oConf.field, oConf.operator, sValue));
                }
            });

            // --- Date range filters ---
            var aDateFilters = [
                { id: "filterGstrp", field: "Gstrp" },
                { id: "filterGltrp", field: "Gltrp" },
                { id: "filterGstrs", field: "Gstrs" },
                { id: "filterGltrs", field: "Gltrs" }
            ];

            aDateFilters.forEach(function (oConf) {
                var oControl = oView.byId(oConf.id);
                var oFrom = oControl.getDateValue();
                var oTo = oControl.getSecondDateValue();
                if (oFrom && oTo) {
                    aFilters.push(new Filter(oConf.field, FilterOperator.BT, oFrom, oTo));
                } else if (oFrom) {
                    aFilters.push(new Filter(oConf.field, FilterOperator.GE, oFrom));
                }
            });

            // --- Boolean filters ---
            var aBoolFilters = [
                { id: "filterIsTeco", field: "IsTeco" },
                { id: "filterIsRel", field: "IsRel" },
                { id: "filterIsCnf", field: "IsCnf" },
                { id: "filterIsDlv", field: "IsDlv" },
                { id: "filterWarnMissingGi", field: "WarnMissingGi" },
                { id: "filterWarnMissingGr", field: "WarnMissingGr" },
                { id: "filterWarnConfImbal", field: "WarnConfImbal" }
            ];

            aBoolFilters.forEach(function (oConf) {
                var sKey = oView.byId(oConf.id).getSelectedKey();
                if (sKey === "true") {
                    aFilters.push(new Filter(oConf.field, FilterOperator.EQ, true));
                } else if (sKey === "false") {
                    aFilters.push(new Filter(oConf.field, FilterOperator.EQ, false));
                }
            });

            return aFilters;
        },

        /**
         * Applies filters to the table binding.
         * On first search the binding is resumed; on subsequent searches filters are reapplied.
         * @param {sap.ui.model.Filter[]} aFilters The filters to apply
         */
        _applyFilters: function (aFilters) {
            var oTable = this.byId("productionOrdersTable");
            var oBinding = oTable.getBinding("items");

            if (oBinding) {
                if (oBinding.isSuspended()) {
                    oBinding.filter(aFilters);
                    oBinding.resume();
                } else {
                    oBinding.filter(aFilters);
                }
            }
        },

        /**
         * Resets all filter controls to their default (empty) state.
         */
        onFilterBarReset: function () {
            var oView = this.getView();
            var aInputIds = [
                "filterAufnr", "filterAuart", "filterWerks", "filterMatnr",
                "filterMatkl", "filterMtart", "filterDispo", "filterFevor",
                "filterArbpl", "filterLgort", "filterCharg", "filterPsPspPnr"
            ];
            aInputIds.forEach(function (sId) {
                oView.byId(sId).setValue("");
            });
            var aDateIds = ["filterGstrp", "filterGltrp", "filterGstrs", "filterGltrs"];
            aDateIds.forEach(function (sId) {
                var oCtrl = oView.byId(sId);
                oCtrl.setDateValue(null);
                oCtrl.setSecondDateValue(null);
            });
            var aSelectIds = [
                "filterIsTeco", "filterIsRel", "filterIsCnf", "filterIsDlv",
                "filterWarnMissingGi", "filterWarnMissingGr", "filterWarnConfImbal"
            ];
            aSelectIds.forEach(function (sId) {
                oView.byId(sId).setSelectedKey("");
            });
        },

        /**
         * Refreshes the table with current filters.
         */
        onRefresh: function () {
            var oComponent = this.getOwnerComponent();
            var oModel = oComponent.getModel();
            if (oModel) {
                oComponent.getModel("serviceState").setProperty("/serviceError", false);
                var oBinding = this.byId("productionOrdersTable").getBinding("items");
                if (oBinding) {
                    oBinding.refresh(true);
                } else {
                    this.onSearch();
                }
            } else {
                oComponent.getModel("serviceState").setProperty("/serviceError", true);
            }
        },

        /**
         * Navigates to the order detail page when a row is pressed.
         * @param {sap.ui.base.Event} oEvent The row press event
         */
        onRowPress: function (oEvent) {
            var oCtx = oEvent.getSource().getBindingContext();
            var sAufnr = oCtx.getProperty("Aufnr");
            this.getOwnerComponent().getRouter().navTo("RouteOrderDetail", {
                orderNumber: encodeURIComponent(sAufnr)
            });
        },

        /**
         * Sets Technical Complete for selected production orders.
         */
        onSetTeco: function () {
            var that = this;
            var oTable = this.byId("productionOrdersTable");
            var aSelectedItems = oTable.getSelectedItems();
            var oI18n = this.getView().getModel("i18n").getResourceBundle();

            if (aSelectedItems.length === 0) {
                MessageBox.warning(oI18n.getText("noOrdersSelected"));
                return;
            }

            var aOrders = aSelectedItems.map(function (oItem) {
                return oItem.getBindingContext().getProperty("Aufnr");
            });
            var sAufnrList = aOrders.join(",");

            MessageBox.confirm(oI18n.getText("tecoConfirmMsg", [aOrders.length]), {
                title: oI18n.getText("tecoConfirmTitle"),
                onClose: function (oAction) {
                    if (oAction === MessageBox.Action.OK) {
                        that._executeSetTeco(sAufnrList, oI18n);
                    }
                }
            });
        },

        /**
         * Calls the SetTechnicalComplete function import.
         * @param {string} sAufnrList Comma-separated order numbers
         * @param {object} oI18n The resource bundle
         */
        _executeSetTeco: function (sAufnrList, oI18n) {
            var that = this;
            var oModel = this.getOwnerComponent().getModel();
            this.getView().setBusy(true);

            oModel.callFunction("/SetTechnicalComplete", {
                method: "POST",
                urlParameters: { AufnrList: sAufnrList },
                success: function (oData) {
                    that.getView().setBusy(false);
                    that._handleTecoResult(oData, oI18n);
                    var oBinding = that.byId("productionOrdersTable").getBinding("items");
                    if (oBinding) {
                        oBinding.refresh(true);
                    }
                    that.byId("productionOrdersTable").removeSelections(true);
                },
                error: function (oError) {
                    that.getView().setBusy(false);
                    var sMsg = "Error";
                    try {
                        sMsg = JSON.parse(oError.responseText).error.message.value;
                    } catch (e) {
                        sMsg = oError.message || oError.statusText || "Unknown error";
                    }
                    MessageBox.error(sMsg, { title: oI18n.getText("tecoResultTitle") });
                }
            });
        },

        /**
         * Shows the TECO result in a message box.
         * @param {object} oData The function import result
         * @param {object} oI18n The resource bundle
         */
        _handleTecoResult: function (oData, oI18n) {
            if (oData.results) {
                var aMessages = oData.results.map(function (oRes) {
                    var sStatus = oRes.Success ? oI18n.getText("success") : oI18n.getText("failed");
                    return oRes.Aufnr + ": " + sStatus + (oRes.MsgText ? " - " + oRes.MsgText : "");
                });
                MessageBox.information(aMessages.join("\n"), {
                    title: oI18n.getText("tecoResultTitle")
                });
            } else if (oData.Aufnr !== undefined) {
                if (oData.Success) {
                    MessageToast.show(oI18n.getText("tecoSuccessMsg", [oData.Aufnr]));
                } else {
                    MessageBox.error(oI18n.getText("tecoErrorMsg", [oData.Aufnr, oData.MsgText]));
                }
            } else {
                MessageToast.show(oI18n.getText("success"));
            }
        }
    });
});
