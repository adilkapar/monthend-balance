/*global QUnit*/

sap.ui.define([
	"ppplanner/controller/ProductionOrder.controller"
], function (Controller) {
	"use strict";

	QUnit.module("ProductionOrder Controller");

	QUnit.test("I should test the ProductionOrder controller", function (assert) {
		var oAppController = new Controller();
		oAppController.onInit();
		assert.ok(oAppController);
	});

});
