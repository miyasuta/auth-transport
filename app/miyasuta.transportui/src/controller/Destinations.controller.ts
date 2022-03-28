import BaseController from "./BaseController";
import Route from "sap/ui/core/routing/Route";
import JSONModel from "sap/ui/model/json/JSONModel";
import Dialog from "sap/m/Dialog";
import ODataListBinding from "sap/ui/model/odata/v4/ODataListBinding";
import ODataModel from "sap/ui/model/odata/v4/ODataModel";
import MessageManager from "sap/ui/core/message/MessageManager";
import MessageBox from "sap/m/MessageBox";
import UI5Event from "sap/ui/base/Event";
import Input from "sap/m/Input";
/**
 * @namespace miyasuta.transportui.controller
 */
export default class Destinations extends BaseController {
	private _dialog: Dialog;
	private _messageManager: MessageManager;
	private _listBinding: ODataListBinding;
	static groupId: string = "createDest";

	public onInit() : void {
		(this.getRouter().getRoute("destinations") as Route).attachPatternMatched(this._onRouteMatched, this);
		this._messageManager = sap.ui.getCore().getMessageManager();
		//this.getView().setModel(this._messageManager.getMessageModel(), "message");
		this._messageManager.registerObject(this.getView(), true);
	}

	public async onAddDestination() : Promise<void> {
		let dialog = await this.loadFragment("DestinationConfig") as Dialog;
		this._dialog = dialog;
		this._dialog.open();
	}

	public onInputChange(oEvent: UI5Event) : void {
		let input = oEvent.getSource();
		this._validateInput(input);
	}

	public onDeleteDestination(oEvent: UI5Event) : void {
		let context = oEvent.getParameter("listItem").getBindingContext();
		MessageBox.confirm(this.getResourceBundle().getText("confirmDelete"), {
			onClose: (oAction: sap.m.MessageBox.Action) => {
				if (oAction === sap.m.MessageBox.Action.OK) {
					context.delete();
				}
			}
		})
	}

	public onCreateDestination() : void {
		//pre check
		if (!this._validated()) {
			return;
		};

		//remove messages
		this._messageManager.removeAllMessages();

		//post destination
		let viewModel = this.getView().getModel("viewModel") as JSONModel;
		let data = {
			destination: viewModel.getProperty("/destinationName"),
			suffix: viewModel.getProperty("/suffix")
		}
		//let listBinding = this.byId("destinationConfig").getBinding("items") as ODataListBinding;
		let listBinding = this._getListBinding();
		listBinding.attachCreateCompleted(this._onCreateCompleted, this);
		listBinding.create(data);

		(this.getView().getModel() as ODataModel).submitBatch(Destinations.groupId)
		.then(()=> {
			this._dialog.close();		
		})
		.catch((error) => {
			this._dialog.close();	
			MessageBox.error(error.message);
		});
	}

	public onCancel() : void {
		this._dialog.close();
	}

	private _validateInput(input: Input) : boolean {
		let valusState = "None";
		let validationError = false;
		let binding = input.getBinding("value");

		try {
			binding.getType().validateValue(input.getValue());
		} catch (exception) {
			validationError = true;
			valusState = "Error";
		}

		input.setValueState(valusState as sap.ui.core.ValueState);
		input.setValueStateText(this.getResourceBundle().getText("inputRequired"));
		return validationError;
	}

	private _validated() : boolean {
		let inputs = [
			this.byId("inputDestination") as Input,
			this.byId("inputSuffix") as Input
		]
		let validated = true;

		inputs.forEach((input) => {
			validated = !this._validateInput(input) && validated;
		}, this)

		return validated;
		// let validated = true;
		// this._clearValueState("inputDestination");
		// this._clearValueState("inputSuffix");

		// let viewModel = this.getView().getModel("viewModel") as JSONModel;
		// let destinationName = viewModel.getProperty("/destinationName");
		// let suffix = viewModel.getProperty("/suffix");
		
		// if (!destinationName) {
		// 	this._setValueStateError("inputDestination");
		// 	validated = false;
		// }
		// if(!suffix) {
		// 	this._setValueStateError("inputSuffix");
		// 	validated = false;
		// }
		// return validated;
	}

	private _clearValueState(id: string) : void {
		let dest = this.byId(id) as Input;
		dest.setValueState("None");
	}

	private _setValueStateError(id: string): void {
		let dest = this.byId(id) as Input;
		dest.setValueState("Error");
		dest.setValueStateText(this.getResourceBundle().getText("inputRequired"));
	}

	private _getListBinding() : ODataListBinding {
		if (!this._listBinding) {
			this._listBinding = this.getView().getModel().bindList("/Suffix", null, null, null, {
				$$updateGroupId: Destinations.groupId
			}) as ODataListBinding;
			//this._listBinding = this.byId("destinationConfig").getBinding("items") as ODataListBinding;
		} 
		return this._listBinding;
	}

	private _destroyListBinding() : void {
		this._listBinding.destroy();
		this._listBinding = undefined;
	};

	private _onRouteMatched() : void {
		this._initializeModel();
	}

	private _onCreateCompleted(): void {
		this._initializeModel();

		//show message
		let messageModel = this._messageManager.getMessageModel();
		let message = messageModel.getData()[0]
		if (message) {
			MessageBox.error(message.message);
		}

		//reset pednding changes
		//error "Cannot cancel the changes for group 'createDest', the batch request is running" is issued,
		//but changes are reset anyway.
		let oDataModel = this.getView().getModel() as ODataModel;
		if (oDataModel.hasPendingChanges()){
			oDataModel.resetChanges(Destinations.groupId);
		}

		//initialize binding
		this._getListBinding().detachCreateCompleted(this._onCreateCompleted, this);
		let items = this.byId("destinationConfig").getBinding("items") as ODataListBinding;
		items.refresh();
	}

	private _initializeModel() : void {
		let viewModel = new JSONModel({
			destinationName: "",
			suffix: ""
		});
		this.getView().setModel(viewModel, "viewModel");
	}

}
