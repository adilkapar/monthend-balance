// @ts-nocheck
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/json/JSONModel",
    "sap/m/SelectDialog",
    "sap/m/StandardListItem",
    "sap/m/MessageBox",
    "sap/m/MessageToast"
],
function (Controller, Filter, FilterOperator, JSONModel, SelectDialog, StandardListItem, MessageBox, MessageToast) {
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
                { id: "filterArbpl", field: "Arbpl", operator: FilterOperator.Contains },
                { id: "filterLgort", field: "Lgort", operator: FilterOperator.EQ }
            ];

            aStringFilters.forEach(function (oConf) {
                var sValue = oView.byId(oConf.id).getValue().trim();
                if (sValue) {
                    aFilters.push(new Filter(oConf.field, oConf.operator, sValue));
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
                "filterMatkl", "filterMtart", "filterArbpl", "filterLgort"
            ];
            aInputIds.forEach(function (sId) {
                oView.byId(sId).setValue("");
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
         * Field configuration for each filter that has a value help.
         * Keyed by the Input control id. `fieldName` is the logical field code
         * passed to the backend GetValueHelp function; `label` is the i18n key
         * used for the dialog title.
         * @returns {object} The value help configuration map
         */
        _getValueHelpConfig: function () {
            return {
                filterAufnr: { fieldName: "AUFNR", label: "order" },
                filterAuart: { fieldName: "AUART", label: "orderType" },
                filterWerks: { fieldName: "WERKS", label: "plant" },
                filterMatnr: { fieldName: "MATNR", label: "material" },
                filterMatkl: { fieldName: "MATKL", label: "materialGroup" },
                filterMtart: { fieldName: "MTART", label: "materialType" },
                filterArbpl: { fieldName: "ARBPL", label: "workCenter" },
                filterLgort: { fieldName: "LGORT", label: "storageLocation" }
            };
        },

        /**
         * Opens a SelectDialog whose entries come from the backend GetValueHelp
         * function import. The function is called with the logical field name and
         * an optional search term; it returns a uniform {FieldName, Key, Text}
         * collection. The chosen Key is written back into the originating input.
         * @param {sap.ui.base.Event} oEvent The valueHelpRequest event
         */
        onValueHelp: function (oEvent) {
            var oInput = oEvent.getSource();
            var sInputId = oInput.getId();
            // Resolve the local (non-prefixed) control id used in the config map
            var sLocalId = Object.keys(this._getValueHelpConfig()).filter(function (sKey) {
                return sInputId.indexOf(sKey) !== -1;
            })[0];

            var oConf = this._getValueHelpConfig()[sLocalId];
            if (!oConf) {
                return;
            }

            var oI18n = this.getView().getModel("i18n").getResourceBundle();
            var sTitle = oI18n.getText("valueHelpTitle", [oI18n.getText(oConf.label)]);

            this._oVHInput = oInput;
            this._oVHConf = oConf;

            // Local model that holds the rows returned by GetValueHelp
            var oVHModel = new JSONModel({ items: [] });

            var oDialog = new SelectDialog({
                title: sTitle,
                growing: true,
                rememberSelections: false,
                search: this._onValueHelpSearch.bind(this),
                liveChange: this._onValueHelpSearch.bind(this),
                confirm: this._onValueHelpConfirm.bind(this),
                cancel: function () {
                    oDialog.destroy();
                }
            });
            oDialog.setModel(oVHModel, "vh");

            var oTemplate = new StandardListItem({
                title: "{vh>Key}",
                description: "{vh>Text}"
            });
            oDialog.bindAggregation("items", {
                path: "vh>/items",
                template: oTemplate
            });

            this.getView().addDependent(oDialog);
            this._oVHDialog = oDialog;
            this._oVHJsonModel = oVHModel;

            oDialog.open();
            // Initial (unfiltered) load
            this._loadValueHelp("");
        },

        /**
         * Calls the backend GetValueHelp function import and feeds the result
         * into the dialog's local JSON model.
         * @param {string} sSearch The search term (may be empty)
         */
        _loadValueHelp: function (sSearch) {
            var that = this;
            var oModel = this.getOwnerComponent().getModel();
            var oConf = this._oVHConf;
            if (!oModel || !oConf || !this._oVHDialog) {
                return;
            }

            this._oVHDialog.setBusy(true);
            oModel.callFunction("/GetValueHelp", {
                method: "GET",
                urlParameters: {
                    FieldName: oConf.fieldName,
                    Search: sSearch || ""
                },
                success: function (oData) {
                    var aItems = (oData && oData.results) ? oData.results : [];
                    if (that._oVHJsonModel) {
                        that._oVHJsonModel.setProperty("/items", aItems);
                    }
                    if (that._oVHDialog) {
                        that._oVHDialog.setBusy(false);
                    }
                },
                error: function () {
                    if (that._oVHJsonModel) {
                        that._oVHJsonModel.setProperty("/items", []);
                    }
                    if (that._oVHDialog) {
                        that._oVHDialog.setBusy(false);
                    }
                    var oI18n = that.getView().getModel("i18n").getResourceBundle();
                    MessageToast.show(oI18n.getText("valueHelpError"));
                }
            });
        },

        /**
         * Re-queries the backend as the user searches in the value help dialog.
         * @param {sap.ui.base.Event} oEvent The search/liveChange event
         */
        _onValueHelpSearch: function (oEvent) {
            var sValue = oEvent.getParameter("value");
            this._loadValueHelp(sValue);
        },

        /**
         * Writes the selected Key back into the originating filter input.
         * @param {sap.ui.base.Event} oEvent The confirm event
         */
        _onValueHelpConfirm: function (oEvent) {
            var oItem = oEvent.getParameter("selectedItem");
            if (oItem && this._oVHInput) {
                var oCtx = oItem.getBindingContext("vh");
                var sKey = oCtx ? oCtx.getProperty("Key") : oItem.getTitle();
                this._oVHInput.setValue(sKey);
            }
            if (this._oVHDialog) {
                this._oVHDialog.destroy();
                this._oVHDialog = null;
            }
            this._oVHJsonModel = null;
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
