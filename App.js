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

        this.buildBanner();
        this.buildLeftSide();
        this.buildRightSide();
        this.subscribeToEvents();
    },

    buildBanner :function() {
        this.add({
            xtype: 'component',
            autoEl: 'h1',
            cls: 'titleText',
            itemId: 'titleText',
            html: 'Please select a MVF from a kanban or grid and it will show here'
        });
    },

    buildLeftSide: function() {
        this.add({
            xtype: 'container',
            cls: 'leftSide',
            items: [
                {
                    xtype: 'component',
                    autoEl: 'h2',
                    cls: 'subTitleText',
                    itemId: 'subTitleText',
                    html: 'Capability Groups:'
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
                            cls: 'addButton',
                            disabled: true,
                            text: 'Add',
                            handler: this.addCapabiltiyGroup,
                            scope: this
                        },
                        {
                            xtype: 'component',
                            cls: 'saveText',
                            itemId: 'saveText'
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

    saveCapabilityGroups: function(refs, callback, scope){
        this.setLoading(true);
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
                callback.call(scope || this);
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

    _userStoryNameFor: function(capabilityGroup) {
        if(capabilityGroup.get) {
            return this.record.get('Name') + ' - ' + capabilityGroup.get('Name');
        } else {
            return this.record.get('Name') + ' - ' + capabilityGroup.name;
        }
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

        this.saveCapabilityGroups(refs, function(){

            this._createUserStory({
                Name: this._userStoryNameFor(record),
                PortfolioItem: this.record.get('_ref'),
                Project: this.record.get('Project')._ref
            }, function() {
                Ext.ComponentQuery.query('#capabilityGroupTree')[0].destroy();
                this.drawTree();
                this.setLoading(false);
            }, this);

        }, this);
        this.drawCapabilityGroups();

    },


    removeCapabilityGroup: function(removeRef){
        if(this.record && this.record.get('MVFOwnerRef') === removeRef) {
            this.setOwner(null);
        }

        var dropdown = Ext.ComponentQuery.query('#capabilityGroupCombobox')[0];
        var capabilityGroupToRemove = dropdown.store.getById(Rally.util.Ref.getOidFromRef(removeRef));

        var refs = this.parseCapabilityGroups();

        refs = Ext.Array.filter(refs, function(ref){
            return ref.ref !== removeRef;
        });

        this.saveCapabilityGroups(refs, function(){

            this._removeUserStory({
                Name: this._userStoryNameFor(capabilityGroupToRemove),
                PortfolioItem: this.record.get('_ref')
            }, function() {
                Ext.ComponentQuery.query('#capabilityGroupTree')[0].destroy();
                this.drawTree();
                this.setLoading(false);
            }, this);

        }, this);
        this.drawCapabilityGroups();

    },

    buildRightSide: function() {
        this.add({
            xtype: 'container',
            itemId: 'rightSide',
            cls: 'rightSide',
            items: [
                {
                    xtype: 'rallybutton',
                    itemId: 'pullButton',
                    cls: 'pullButton',
                    disabled: true,
                    text: 'Pull stories from MVF',
                    handler: this.pullFeature,
                    scope: this
                },
                {
                    xtype: 'component',
                    itemId: 'pullText',
                    cls: 'pullText',
                    html: 'Moving stories to the right project...'
                }
            ]
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
                            model.load(5018681742, {
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
            fetch: ['ObjectID', 'State','OrderIndex','TypeDef', 'Name', 'FormattedID', 'MVFOwner', 'MVFOwnerRef', 'CapabilityGroups', 'CapabilityGroupRefs'],
            scope: this
        });

    },

    onRecordLoaded: function(record){
        this.record = record;
        this.updateTitle();
        this.drawCapabilityGroups();

        var tree = Ext.ComponentQuery.query('#capabilityGroupTree');
        if(tree && tree.length > 0) {
            tree[0].destroy();
        }

        this.drawTree();
        Ext.ComponentQuery.query('#addButton')[0].enable();
        Ext.ComponentQuery.query('#pullButton')[0].enable();
    },

    updateTitle: function() {
        var record = this.record;

        Ext.ComponentQuery.query('#titleText')[0].getEl().setHTML(record.get('FormattedID') + ' : ' + record.get('Name'));
    },

    setOwner: function(owner) {

        var newOwnerCheckbox;
        Ext.Array.each(Ext.ComponentQuery.query('checkbox'), function(checkbox) {
            var isOwner = owner && checkbox.data === owner.ref;
            if (isOwner) {
                newOwnerCheckbox = checkbox;
            } else {
                checkbox.setValue(false);
            }
        });
        if(newOwnerCheckbox) {
            if(newOwnerCheckbox.getValue() === false) {
                newOwnerCheckbox.setValue(true);
            }
        }

        this.record.set('MVFOwner', owner && owner.name || '');
        this.record.set('MVFOwnerRef', owner && owner.ref || '');
    },

    delayedSave: function() {
        if (this.savePending){
            return;
        }
        this.savePending = Ext.defer(function(){
            this.savePending = false;
            this.record.save();
        }, 1, this);
    },

    _onCheckboxChange: function(capabilityGroup, isChecked) {
        this.setOwner(isChecked ? capabilityGroup : null);
        this.delayedSave();
    },

    drawTree: function() {
        Ext.ComponentQuery.query('#rightSide')[0].add({
            xtype: 'rallytree',
            cls: 'capabilityGroupTree',
            itemId: 'capabilityGroupTree',
            topLevelModel: this.record.self.typePath,
            parentAttributeForChildRecordFn: function() {
                return 'PortfolioItem';
            },
            topLevelStoreConfig: {
                filters: [
                    {
                        property: 'ObjectID',
                        value: this.record.get('ObjectID')
                    }
                ],
                context: {
                    project: this.record.get('Project')._ref
                },
                fetch: ['Name', 'DirectChildrenCount', 'FormattedID', 'ObjectID']
            },
            childItemsStoreConfigForParentRecordFn: function(){
                return {
                    sorters: []
                };
            },
            canExpandFn: function(record){
                return record.get('DirectChildrenCount') > 0;
            },
            listeners: {
                toplevelload: function() {
                    var treeItem = Ext.ComponentQuery.query('#capabilityGroupTree rallytreeitem')[0];
                    Ext.ComponentQuery.query('#capabilityGroupTree')[0].expandItem(treeItem);
                    treeItem.setExpanded(true);
                    treeItem.draw();
                },
                scope: this
            },
            scope: this
        });
    },

    drawCapabilityGroups: function() {

        var capabilityGroupsComponent = Ext.ComponentQuery.query('#capabilityGroups')[0];
        capabilityGroupsComponent.removeAll();

        var capabilityGroups = this.parseCapabilityGroups();
        if(capabilityGroups.length <= 0) {
            return;
        }

        var mvfOwnerRef = this.record.get('MVFOwnerRef');

        Ext.Array.each(capabilityGroups, function(capabilityGroup){
            var container = capabilityGroupsComponent.add({
                xtype: 'container',
                cls: 'capabilityGroup',
                items: [
                    {
                        xtype: 'checkbox',
                        cls: 'ownerCheckbox',
                        boxLabel: capabilityGroup.name,
                        boxLabelAttrTpl: 'style="position: relative; top: 2px;"',
                        checked: mvfOwnerRef === capabilityGroup.ref,
                        value: mvfOwnerRef === capabilityGroup.ref,
                        data: capabilityGroup.ref,
                        listeners: {
                            change: function(checkbox, value) {
                                this._onCheckboxChange(capabilityGroup, value);
                            },
                            scope: this
                        }
                    },
                    {
                        xtype: 'rallybutton',
                        ui: 'link',
                        cls: 'deleteCapabilityGroup',
                        html: 'X',
                        tooltip: 'Remove',
                        tooltipType: 'title',
                        listeners: {
                            click: function() {
                                this.removeCapabilityGroup(capabilityGroup.ref);
                            },
                            scope: this
                        }
                    },
                    {
                        xtype: 'component',
                        itemId: 'ownerText',
                        cls: 'ownerText',
                        html: 'Owner'
                    }
                ]
            });
        }, this);
    },


    pullFeature: function(){
        // Create a child user story in each capability group (project)
        Ext.ComponentQuery.query('#pullButton')[0].disable();
        Ext.ComponentQuery.query('#pullText')[0].addCls('pullTextVisible');
        this.pullChildStories(function(stories){
            this.saveAll(stories, function(){
                Ext.ComponentQuery.query('#capabilityGroupTree')[0].destroy();
                this.drawTree();
                Ext.ComponentQuery.query('#pullButton')[0].enable();
                Ext.ComponentQuery.query('#pullText')[0].removeCls('pullTextVisible');
            }, this);
        }, this);

        // Change the project of the MVF (portfolioitem/feature) to the Owner Capability group (project)
        // Move the MVF to the next state
        this.moveMVFToDev();
    },

    pullChildStories: function(callback, scope) {
        Rally.data.ModelFactory.getModel({
            type: 'Userstory',
            success: function(UserStory) {

                // Load child stories
                var store = Ext.create('Rally.data.WsapiDataStore', {
                    autoLoad: true,
                    limit: Infinity,
                    model: 'User Story',
                    filters: [
                        {
                            property: 'PortfolioItem',
                            value: this.record.get('_ref')
                        }
                    ],
                    context: {
                        project: this.record.get('Project')._ref,
                        projectScopeDown: true
                    },
                    listeners: {
                        load: function(store, records) {

                            records = Ext.Array.clone(records);
                            capabilityGroups = this.parseCapabilityGroups();

                            var saveOne = function() {
                                if(records.length > 0) {
                                    record = records.shift();

                                    Ext.Array.each(capabilityGroups, function(group){
                                        if(record.get('Name') === this._userStoryNameFor(group)) {
                                            record.set('Project', group.ref);
                                        }
                                    }, this);
                                    record.save({
                                        success: saveOne,
                                        scope: this
                                    });
                                } else {
                                    if (callback) {
                                        callback.call(scope || this, records);
                                    }
                                }
                            };
                            saveOne.call(this);
                        },
                        scope: this
                    }
                });
            },
            scope: this
        });
    },

    /**
    * Given an array of model objects, saves them sequentially, one at a time.
    */
    saveAll: function(items, callback, scope) {
        items = Ext.Array.clone(items);
        var saveOne = function(){
            if (items.length > 0) {
                item = items.shift();
                item.save({
                    success: saveOne
                });
            } else {
                callback.call(scope || this);
            }
        }
        saveOne();
    },

    moveMVFToDev: function() {
        var ownerRef = this.record.get('MVFOwnerRef');
        if (ownerRef) {
            this.record.set({
                Project: ownerRef
            });
        }
        var state = this.record.get('State');
        if(state && state.TypeDef && state.TypeDef._ref) {
            Ext.create('Rally.data.WsapiDataStore', {
                autoLoad: true,
                model: 'State',
                filters: [
                    {
                        property: 'TypeDef',
                        value: state.TypeDef._ref
                    },
                    {
                        property: 'OrderIndex',
                        value: state.OrderIndex + 1
                    }
                ],
                listeners: {
                    load: function(store, records){
                        if(records.length > 0) {
                            this.record.set('State', records[0].get('_ref'));
                            this.record.save();
                        }
                    },
                    scope: this
                }
            });
        }
    },

    _createUserStory: function(data, callback, scope) {

        Rally.data.ModelFactory.getModel({
            type: 'Userstory',
            success: function(UserStory) {

                var story = new UserStory(data);

                story.save({
                    callback: function() {
                        if (callback) {
                            callback.call(scope || this, story);
                        }
                    },
                    scope: scope || this
                });
            },
            scope: this
        });
    },

    _removeUserStory: function(data, callback, scope) {

        var filters = [];
        Ext.Object.each(data, function(key, value) {
            filters.push({
                property: key,
                value: value
            });
        });

        Ext.create('Rally.data.WsapiDataStore', {
            autoLoad: true,
            model: 'UserStory',
            filters: filters,
            context: {
                project: null
            },
            listeners: {
                load: function(store, records){
                    if (records && records.length > 0){
                        records[0].destroy({
                            success: callback,
                            scope: scope || this
                        });
                    } else {
                        callback.call(scope || this);
                    }
                },
                scope: this
            }
        });
    }



}, function(){
    if (!Rally.Message.objectFocus){
        Rally.Message.objectFocus = "objectfocus"; // HACK
    }
}); 














