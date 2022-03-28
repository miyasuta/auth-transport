import BaseController from "./BaseController";
import ToolPage from "sap/tnt/ToolPage";
import Event from "sap/ui/base/Event";
import UI5Event from "sap/ui/base/Event";

/**
 * @namespace miyasuta.transportui.controller
 */
export default class App extends BaseController {

	public onInit() : void {
		// apply content density mode to root view
		this.getView().addStyleClass(this.getOwnerComponent().getContentDensityClass());
	}

	public onSideNavButtonPress() : void {
		var oToolPage = this.byId("toolPage") as ToolPage;
		oToolPage.setSideExpanded(!oToolPage.getSideExpanded());
	}

	public onItemSelect(oEvent: UI5Event) : void {
		var oItem = oEvent.getParameter("item");
		var sKey = oItem.getKey();
		var oRouter = this.getRouter();
		oRouter.navTo(sKey);
	}

}
