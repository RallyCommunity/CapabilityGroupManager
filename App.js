Ext.define('CapabilityGroupManagerApp', {

    extend: 'Rally.app.App',
    componentCls: 'app',

    ordinalValueForPulledFeatures: 2,

    customFields: {
        Names: 'CapabilityGroups',
        Refs: 'CapabilityGroupRefs',
    },

    mixins: {
        messageable: 'Rally.Messageable'
    },

    items: [
        {
            xtype: 'component',
            autoEl: 'h1',
            cls: 'titleText',
            itemId: 'titleText',
            html: 'Please select a MVF from a kanban or grid and it will show here'
        }
    ],

    launch: function() {
        this.numRequests = 0;

        this._loadNeededData();
        this.buildUI();
        this.subscribeToEvents();
    },

    subscribeToEvents: function(){
        this.subscribe(Rally.Message.objectFocus, function(record){
            this.record = record;
            this.loadRecord();
        }, this);

        this.capabilityGroupEditor.on('addCapabilityGroup', this.addCapabilityGroup, this);
        this.capabilityGroupEditor.on('removeCapabilityGroup', this.removeCapabilityGroup, this);
        this.capabilityGroupEditor.on('mvfOwnerChange', this._onMVFOwnerChange, this);
        this.mvfTree.on('pullButtonClicked', this.pullFeature, this);
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

    _loadNeededData: function() {

        // TODO - remove this:
        // this.loadDummyRecordForTesting();

        Ext.create('Rally.data.WsapiDataStore', {
            autoLoad: true,
            model: 'Project',
            filters: [
                {
                    property: 'Name',
                    operator: 'Contains',
                    value: 'MVF Backlog'
                }
            ],
            listeners: {
                load: function(store, records){
                    this.capabilityGroupStore = store;
                    this.loadRecord();
                },
                scope: this
            }
        });


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
                    this.featureStateTypeDef = records[0].get('_ref');
                    
                    Rally.data.ModelFactory.getModel({
                        type: records[0].get('TypePath'),
                        success: function(model){
                            this.lowestType = model;
                            this.loadRecord();
                        },
                        scope: this
                    });
                },
                scope: this
            }
        });
    },

    loadRecord: function(){
        this.setSaveMessage('');
        
        if(!this.capabilityGroupStore || !this.record || !this.lowestType || this.lowestType.typePath !== this.record.self.typePath) {
            return;
        }

        //record not guaranteed to be fully hydrated, need to get the full object.
        this.record.self.load(this.record.get('ObjectID'), {
            success: this.onRecordLoaded,
            fetch: ['Project', 'ObjectID', 'State', 'OrderIndex','TypeDef', 'Name', 'FormattedID', 'MVFOwner', 'MVFOwnerRef', 'CapabilityGroups', 'CapabilityGroupRefs'],
            scope: this
        });

    },

    onRecordLoaded: function(record){
        this.record = record;
        this.updateTitle();
        this.drawCapabilityGroups();

        this.mvfTree.redrawTree(this.record);
        Ext.ComponentQuery.query('#addButton')[0].enable();
        this._enableOrDisablePullStoriesButton();
    },

    buildUI: function() {
        this.capabilityGroupEditor = this.add({
            xtype: 'capabilitygroupeditor',
            cls: 'leftSide'
        });

        this.mvfTree = this.add({
            xtype: 'mvftree',
            cls: 'rightSide'
        });
    },

    parseCapabilityGroups: function(){
        var capabilityGroups = this.record.get('CapabilityGroupRefs');
        var refs = capabilityGroups && capabilityGroups.split(',') || [];
        var newRefs = [];

        Ext.Array.each(refs, function(ref){
            var record = this.capabilityGroupStore.getById(Rally.util.Ref.getOidFromRef(ref));
            if (record) {
                newRefs.push({
                    ref: ref,
                    name: record.get('Name')
                });
            }
        }, this);

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
        this.capabilityGroupEditor.setSaveMessage(msg);
    },

    _userStoryNameFor: function(capabilityGroup) {
        if(capabilityGroup.get) {
            return this.record.get('Name') + ' - ' + capabilityGroup.get('Name');
        } else {
            return this.record.get('Name') + ' - ' + capabilityGroup.name;
        }
    },

    addCapabilityGroup: function(value){
        var refs = this.parseCapabilityGroups();

        var isDuplicate = Ext.Array.some(refs, function(ref){
            return ref.ref == value;
        });
        if (isDuplicate) {
            return;
        }

        var record = this.capabilityGroupStore.getById(Rally.util.Ref.getOidFromRef(value));
        refs.push({
            ref: value,
            name: record.get('Name')
        });

        this.saveCapabilityGroups(refs, function(){

            this._createUserStory({
                Name: this._userStoryNameFor(record),
                PortfolioItem: this.record.get('_ref'),
                Project: this.record.get('Project')._ref,
                ScheduleState: 'Defined'
            }, function() {
                this.mvfTree.redrawTree(this.record);
                this._enableOrDisablePullStoriesButton();
                this.setLoading(false);
            }, this);

        }, this);
        this.drawCapabilityGroups();
    },


    removeCapabilityGroup: function(removeRef){
        if(this.record && this.record.get('MVFOwnerRef') === removeRef) {
            this.setOwner(null, true);
        }

        var capabilityGroupToRemove = this.capabilityGroupStore.getById(Rally.util.Ref.getOidFromRef(removeRef));

        var refs = this.parseCapabilityGroups();

        refs = Ext.Array.filter(refs, function(ref){
            return ref.ref !== removeRef;
        });

        this.saveCapabilityGroups(refs, function(){

            this._removeUserStory({
                Name: this._userStoryNameFor(capabilityGroupToRemove),
                PortfolioItem: this.record.get('_ref')
            }, function() {
                this.mvfTree.redrawTree(this.record);
                this._enableOrDisablePullStoriesButton();
                this.setLoading(false);
            }, this);

        }, this);
        this.drawCapabilityGroups();

    },

    updateTitle: function() {
        Ext.ComponentQuery.query('#titleText')[0].getEl().setHTML(this.record.get('FormattedID') + ' : ' + this.record.get('Name'));
    },

    setOwner: function(owner, dontSave) {
        this.setLoading(true);
        this.record.set('MVFOwner', owner && owner.name || '');
        this.record.set('MVFOwnerRef', owner && owner.ref || '');
        if(!dontSave) {
            this.record.save({
                callback: function(){
                    this.setLoading(false);
                    this._enableOrDisablePullStoriesButton();
                },
                scope: this
            });
        }
    },

    _onMVFOwnerChange: function(capabilityGroup) {
        this.setOwner(capabilityGroup);
    },

    drawCapabilityGroups: function() {

        var capabilityGroups = this.parseCapabilityGroups();
        var mvfOwnerRef = this.record.get('MVFOwnerRef');

        this.capabilityGroupEditor.drawCapabilityGroups(capabilityGroups, mvfOwnerRef);
    },


    pullFeature: function(){
        this.mvfTree.showPulling(true);

        this.pullChildStories(function(stories){
            this.moveMVFToDev(function(){
                this.saveAll(stories, function(){
                    this.mvfTree.redrawTree(this.record);
                    this._enableOrDisablePullStoriesButton();
                    this.mvfTree.showPulling(false);
                }, this);
            }, this);
        }, this);
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

    moveMVFToDev: function(callback, scope) {
        var ownerRef = this.record.get('MVFOwnerRef');
        if (ownerRef) {
            this.record.set({
                Project: ownerRef
            });
        }
        if(this.featureStateTypeDef) {
            Ext.create('Rally.data.WsapiDataStore', {
                autoLoad: true,
                model: 'State',
                filters: [
                    {
                        property: 'TypeDef',
                        value: this.featureStateTypeDef
                    },
                    {
                        property: 'OrderIndex',
                        value: this.ordinalValueForPulledFeatures
                    }
                ],
                listeners: {
                    load: function(store, records){
                        if(records.length > 0) {
                            this.record.set('State', records[0].get('_ref'));
                            this.record.save({
                                callback: function(){
                                    if(callback){
                                        callback.call(scope || this);
                                    }
                                },
                                scope: scope
                            });
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
    },

    _enableOrDisablePullStoriesButton: function() {

        var mvfOwnerRef = this.record.get('MVFOwnerRef');

        if(!mvfOwnerRef || (mvfOwnerRef && this.record.get('Project')._ref === mvfOwnerRef)) {
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
                            project: null
                        },
                        listeners: {
                            load: function(store, records) {
                                capabilityGroups = this.parseCapabilityGroups();

                                var allChildrenInCapabilityGroupProject = true;
                                Ext.Array.each(records, function(record){
                                    var projectRef = record.get('Project')._ref;
                                    var name = record.get('Name');

                                    Ext.Array.each(capabilityGroups, function(capabilityGroup){
                                        if(name === this._userStoryNameFor(capabilityGroup) && projectRef !== capabilityGroup.ref) {
                                            allChildrenInCapabilityGroupProject = false;
                                        }
                                    }, this);
                                },this);

                                if(allChildrenInCapabilityGroupProject) {
                                    this.mvfTree.disablePull();
                                } else {
                                    this.mvfTree.enablePull();
                                }

                            },
                            scope: this
                        }
                    });
                },
                scope: this
            });
        } else {
            this.mvfTree.enablePull();
        }

        if(!mvfOwnerRef) {
            if(this.parseCapabilityGroups().length > 0) {
                this.mvfTree.setOwnerText('Please select an owner');    
            } else {
                this.mvfTree.hideOwnerText();
            }
        } else if (mvfOwnerRef !== this.record.get('Project')._ref) {
            this.mvfTree.setOwnerText("Click 'Pull' to move the MVF into the new owner's project");
        } else {
            this.mvfTree.hideOwnerText();
        }
        
    }



}, function(){
    if (!Rally.Message.objectFocus){
        Rally.Message.objectFocus = "objectfocus"; // hack to get it to run externally
    }
}); 














