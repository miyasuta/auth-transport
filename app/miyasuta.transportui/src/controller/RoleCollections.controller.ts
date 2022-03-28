import BaseController from "./BaseController";
import ResourceBundle from "sap/base/i18n/ResourceBundle";
import JSONModel from "sap/ui/model/json/JSONModel";
import UI5Event from "sap/ui/base/Event";
import TextArea from "sap/m/TextArea";
import MessageStrip from "sap/m/MessageStrip";
import VerticalLayout from "sap/ui/layout/VerticalLayout";
import WizardStep from "sap/m/WizardStep";
import Page from "sap/m/Page";
import Route from "sap/ui/core/routing/Route";
import { MessageType } from "sap/ui/core/library";
import Wizard from "sap/m/Wizard";
import DynamicPage from "sap/f/DynamicPage";
import Control from "sap/ui/core/Control";


/**
 * @namespace miyasuta.transportui.controller
 */
export default class RoleCollections extends BaseController {
	private _messageStrips: any[];

	public onInit() : void {
		(this.getRouter().getRoute("rolecollections") as Route).attachPatternMatched(this._onRouteMatched, this);
		//store messages for destination validation
		this._setMessageStrips();	
	}

	public onValidateDestinations(): void {
		//remove all message strips
		this._messageStrips.forEach((messageStrip) => {
			(this.byId("selectDestinations") as VerticalLayout).removeContent(messageStrip);
		});

		//check destinations are not empty and not the same
		let viewModel = this.getView().getModel("viewModel") as JSONModel;
		let source = viewModel.getProperty("/destinations/source");
		let target = viewModel.getProperty("/destinations/target");
		if (source === "" || target === "") {		
			(this.byId("selectDestinations") as VerticalLayout).insertContent(this._messageStrips[0], 0);
			(this.byId("step1") as WizardStep).setValidated(false)
			return;
		}
		if (source === target) {
			(this.byId("selectDestinations") as VerticalLayout).insertContent(this._messageStrips[1], 0);
			(this.byId("step1") as WizardStep).setValidated(false)
			return;
		}
		(this.byId("step1") as WizardStep).setValidated(true)
	}

	public onRoleCollectionsInput(oEvent: UI5Event) : void {
		let text = this.getView().getModel("viewModel").getProperty("/roleCollectionsInput");
		let roleCollections = text.split("\n");
		//remove blank lines
		roleCollections = roleCollections.reduce((arr, current)  => {
			if (current !== "") {
				arr.push({
					name: current,
					status: this.getResourceBundle().getText("progress")
				});
			}
			return arr;
		}, []); 
		(this.getView().getModel("viewModel") as JSONModel).setProperty("/roleCollections", roleCollections);		
	}

	public async onComplete(oEvent: UI5Event) : Promise<void> {
		//swith to transport view
		let fragment = await this.loadFragment("Transport");
		this._setNewContent(fragment);
		(this.byId("transportLayout") as VerticalLayout).removeContent(this._messageStrips[3]);
		(this.byId("transportLayout") as VerticalLayout).insertContent(this._messageStrips[2], 0);

		this._doTrnsport()
		.then(results=> {
			this._mapResults(results);
			this._switchMessageStrips();
		});
	}

	public formatStatus(status: string) : string {
		switch(status) {
			case "Progress":
				return "None";
			case "Success":
				return "Success";
			case "Error":
				return "Error";
			default:
				return "None";
		}
	}

	private _setMessageStrips(): void {
		this._messageStrips = [];
		this._AddMessageStrip("roleCollections.destinations.empty", "Information" as MessageType);
		this._AddMessageStrip("roleCollections.destinations.same", "Error" as MessageType);
		this._AddMessageStrip("transportMessage", "Warning" as MessageType);
		this._AddMessageStrip("transportComplete", "Success" as MessageType);
	}	

	private _AddMessageStrip(text: string, type: MessageType) : void {
		let messageStrip = new MessageStrip({
			text: (this.getResourceBundle() as ResourceBundle).getText(text),
			type: type,
			showIcon: true
		});	
		this._messageStrips.push(messageStrip);
	}

	private async _onRouteMatched(oEvent: UI5Event) : Promise<void> {
		this._initializeModel();
		let wizard = await this.loadFragment("Wizard") as Wizard;
		
		//initialize wizard
		wizard.discardProgress(wizard.getSteps()[0], true);
		(this.byId("step1") as WizardStep).setValidated(false);
		(this.byId("selectDestinations") as VerticalLayout).insertContent(this._messageStrips[0], 0);
		this._setNewContent(wizard);

		//refresh binding of destinations
		this.byId("source").getBinding("items").refresh();
		this.byId("target").getBinding("items").refresh();
	}

	private _setNewContent(newContent: Control) : void {
		let page = this.byId("roleCollectionPage") as Page;
		page.removeAllContent();
		page.addContent(newContent);

		// let dynamicPage = this.byId("roleCollectionPage") as DynamicPage;
		// dynamicPage.setContent(newContent);
	}

	private _initializeModel() : void {
		var oModel = new JSONModel({
			destinations: {
				source: "",
				target: ""
			},
			roleCollectionsInput: "",
			roleCollections: []
		})
		this.getView().setModel(oModel, "viewModel");
	}

	private async _doTrnsport() : Promise<object> {
		let viewModel = this.getView().getModel("viewModel") as JSONModel;
		let roleCollections = viewModel.getProperty("/roleCollections").map((roleCollection) => roleCollection.name);
		let source = viewModel.getProperty("/destinations/source");
		let target = viewModel.getProperty("/destinations/target");
		let data = {
			destinations: {
				source: source,
				target: target
			},
			roleCollections: roleCollections	
		}
		let settings = {
			url: "/auth-transport/transportRoleCollections",
			method: "POST",
			async: true,
			headers: {
				"Content-Type": "application/json"
			},
			data: JSON.stringify(data)
		}
		return new Promise((resolve, reject) => {
			$.ajax(settings).done((response) => {
				resolve(response.value);
			}).fail((error) => {
				reject(error);
			});	
		})
	}

	private _mapResults(results: object[]) : void {
		let viewModel = this.getView().getModel("viewModel") as JSONModel;
		let roleCollections = viewModel.getProperty("/roleCollections");
		results.forEach((result) => {
			let roleCollection = roleCollections.find((roleCollection) => roleCollection.name === result.roleCollection);
			roleCollection.status = this.getResourceBundle().getText(result.result);
			roleCollection.message = result.message;
		});
		viewModel.setProperty("/roleCollections", roleCollections);
	}

	private _switchMessageStrips() : void {
		(this.byId("transportLayout") as VerticalLayout).removeContent(this._messageStrips[2]);
		(this.byId("transportLayout") as VerticalLayout).insertContent(this._messageStrips[3], 0);
	}
}
