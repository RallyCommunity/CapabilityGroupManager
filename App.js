Ext.define('CapabilityGroupManagerApp', {

    extend: 'Rally.app.App',
    componentCls: 'app',

    customFields: {
    	Names: 'CapabilityGroups',
    	Refs: 'CapabilityGroupRefs',
    },

    mixins: {
        messageable: 'Rally.Messageable'
    },

    launch: function() {
    	this.numRequests = 0;

    	this.buildLeftSide();
    	this.buildRightSide();
        this.subscribeToEvents();
	},

	buildLeftSide: function() {
		this.add({
			xtype: 'container',
			cls: 'leftSide',
			items: [
				{
		            xtype: 'component',
		            autoEl: 'h1',
		            cls: 'titleText',
		            itemId: 'titleText',
		            html: 'No Feature Selected'
				},
				{
					xtype:'container',
					items: [
						{
				            xtype: 'component',
				            autoEl: 'h2',
				            cls: 'subTitleText',
				            itemId: 'subTitleText',
				            html: 'Capability Groups:'
						},
						{
							xtype: 'component',
							cls: 'saveText',
							itemId: 'saveText'
						}
					]
				},
				{
					xtype: 'container',
					cls: 'capabilityGroups',
					itemId: 'capabilityGroups',
					html: ''
				},
				{
					xtype: 'container',
					items: [
						{
							xtype: 'capabilitygroupcombobox',
							fieldLabel: '',
							itemId: 'capabilityGroupCombobox',
							cls: 'capabilityGroupCombobox',
							labelWidth: 0,
							storeConfig: {
								listeners: {
									load: this.onStoreDataLoaded,
									scope: this
								}
							}
						},
						{
							xtype: 'button',
							itemId: 'addButton',
							disabled: true,
							text: 'Add',
							handler: this.addCapabiltiyGroup,
							scope: this
						}
					]
				}
			]
        });
	},

	onStoreDataLoaded: function(){
		this.storeDataLoaded = true;
        this.loadRecord();
	},

	parseCapabilityGroups: function(){
		var dropdown = Ext.ComponentQuery.query('#capabilityGroupCombobox')[0];
		var capabilityGroups = this.record.get('CapabilityGroupRefs');
		var refs = capabilityGroups && capabilityGroups.split(',') || [];
		var newRefs = [];

		Ext.Array.each(refs, function(ref){
			if(dropdown && dropdown.store) {
				var record = dropdown.store.getById(Rally.util.Ref.getOidFromRef(ref));
				if (record) {
					newRefs.push({
						ref: ref,
						name: record.get('Name')
					});
				}
			}
		});

		return newRefs;
	},

	saveCapabilityGroups: function(refs){
		this.record.set('CapabilityGroupRefs', Ext.Array.map(refs, function(ref){
			return ref.ref;
		}).join(','));
		this.record.set('CapabilityGroups', Ext.Array.map(refs, function(ref){
			return ref.name;
		}).join(', '));

		this.showSaveText();
		this.record.save({
			callback: function() {
				this.hideSaveText();
			},
			scope: this
		});
	},

	showSaveText: function() {
		this.numRequests++;
		this.setSaveMessage('Saving...');
	},

	hideSaveText: function() {
		this.numRequests--;
		if(this.numRequests <= 0) {
			this.setSaveMessage('Saved');
		}
	},

	setSaveMessage: function(msg){
		Ext.ComponentQuery.query('#saveText')[0].getEl().setHTML(msg);
	},

	addCapabiltiyGroup: function(){
		var dropdown = Ext.ComponentQuery.query('#capabilityGroupCombobox')[0];
		var value = dropdown.getValue();

		var refs = this.parseCapabilityGroups();

		var isDuplicate = Ext.Array.some(refs, function(ref){
			return ref.ref == value;
		});
		if (isDuplicate) {
			return;
		}

		var record = dropdown.store.getById(Rally.util.Ref.getOidFromRef(value));
		refs.push({
			ref: value,
			name: record.get('Name')
		});

		this.saveCapabilityGroups(refs);
		this.drawCapabilityGroups();
	},


    removeCapabilityGroup: function(removeRef){
		var refs = this.parseCapabilityGroups();

		refs = Ext.Array.filter(refs, function(ref){
			return ref.ref !== removeRef;
		});

		this.saveCapabilityGroups(refs);
		this.drawCapabilityGroups();
    },

	buildRightSide: function() {
		this.add({
			xtype: 'container',
			cls: 'rightSide'
		});
	},

	loadDummyRecordForTesting: function(){
        // Temp - for testing:
        Ext.create('Rally.data.WsapiDataStore', {
            autoLoad: true,
            model: 'TypeDefinition',
            filters: [
                {
                    property: 'Parent.Name',
                    value: 'Portfolio Item'
                },
                {
                    property: 'Ordinal',
                    value: 0
                }
            ],
            listeners: {
                load: function(store, records){
                    Rally.data.ModelFactory.getModel({
                        type: records[0].get('TypePath'),
                        success: function(model){
                        	model.find({
                        		callback: function(record) {
                        			this.publish(Rally.Message.objectFocus, record);
                        		},
                        		scope: this
                        	});

                        },
                        scope: this
                    });
                },
                scope: this
            }
        });
        
    },

    subscribeToEvents: function(){
        this.subscribe(Rally.Message.objectFocus, function(record){
    		this.record = record;
            this.loadRecord();
        }, this);

        Ext.create('Rally.data.WsapiDataStore', {
            autoLoad: true,
            model: 'TypeDefinition',
            filters: [
                {
                    property: 'Parent.Name',
                    value: 'Portfolio Item'
                },
                {
                    property: 'Ordinal',
                    value: 0
                }
            ],
            listeners: {
                load: function(store, records){
                    Rally.data.ModelFactory.getModel({
                        type: records[0].get('TypePath'),
                        success: function(model){
                        	this.lowestType = model;

                        	// TODO - remove this:
                        	this.loadDummyRecordForTesting();
                        },
                        scope: this
                    });
                },
                scope: this
            }
        });
    },

    loadRecord: function(){
    	this.setSaveMessage('')
        
        if(!this.storeDataLoaded || !this.record || !this.lowestType || this.lowestType.typePath !== this.record.self.typePath) {
        	return;
        }

        //record not guaranteed to be fully hydrated, need to get the full object.
        this.record.self.load(this.record.get('ObjectID'), {
            success: this.onRecordLoaded,
            fetch: true,
            scope: this
        });

    },

    onRecordLoaded: function(record){
    	this.record = record;
    	this.updateTitle();
    	this.drawCapabilityGroups();
    	Ext.ComponentQuery.query('#addButton')[0].enable();
    },

    updateTitle: function() {
    	var record = this.record;

    	Ext.ComponentQuery.query('#titleText')[0].getEl().setHTML(record.get('FormattedID') + ' : ' + record.get('Name'));
    },

    drawCapabilityGroups: function() {

    	var capabilityGroupsComponent = Ext.ComponentQuery.query('#capabilityGroups')[0];
    	capabilityGroupsComponent.removeAll();

    	var capabilityGroups = this.parseCapabilityGroups();
    	if(capabilityGroups.length <= 0) {
    		return;
    	}

        Ext.Array.each(capabilityGroups, function(capabilityGroup){
			capabilityGroupsComponent.add({
                xtype: 'container',
                cls: 'capabilityGroup',
                items: [
                    {
                        xtype: 'component',
                        cls: 'capabilityGroupName',
                        html: capabilityGroup.name
                    },
                    {
                        xtype: 'rallybutton',
                        ui: 'link',
                        cls: 'deleteCapabilityGroup',
                        html: 'X',
                        listeners: {
                            click: function() {
                                this.removeCapabilityGroup(capabilityGroup.ref);
                            },
                            scope: this
                        }
                    }
                ]
    		})
        }, this);
    }

}, function(){
	if (!Rally.Message.objectFocus){
		Rally.Message.objectFocus = "objectfocus"; // HACK
	}
});	
