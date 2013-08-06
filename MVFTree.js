Ext.define('MVFTree', {
	extend: 'Ext.Container',
	alias: 'widget.mvftree',

	items: [
        {
            xtype: 'rallybutton',
            itemId: 'pullButton',
            cls: 'pullButton',
            disabled: true,
            width: 140,
            text: 'Pull stories from Feature'
        },
        {
            xtype: 'component',
            itemId: 'pullText',
            cls: 'pullText',
            html: 'Moving stories to the right project...'
        },
        {
        	xtype: 'component',
        	itemId: 'changeOwnerText',
        	cls: 'changeOwnerText',
        	html: ''
        }
	],

	initComponent: function() {
		this.callParent(arguments);
		this.pullButton = Ext.ComponentQuery.query('#pullButton')[0];
		this.pullButton.on('click', this._onPullButtonClicked, this);
	},

	_onPullButtonClicked: function() {
		this.fireEvent('pullButtonClicked');
	},

	setOwnerText: function(msg) {
		Ext.ComponentQuery.query('#changeOwnerText')[0].addCls('changeOwnerTextVisible');
		Ext.ComponentQuery.query('#changeOwnerText')[0].getEl().setHTML(msg);
	},

	hideOwnerText: function() {
		Ext.ComponentQuery.query('#changeOwnerText')[0].removeCls('changeOwnerTextVisible');
	},

	enablePull: function(){
        this.pullButton.setText('Pull stories from Feature');
        this.pullButton.enable();
	},

	disablePull: function(){
        this.pullButton.setText('No changes');
        this.pullButton.disable();
	},

	showPulling: function(pulling){
		if (pulling) {
	        this.pullButton.disable();
	        Ext.ComponentQuery.query('#pullText')[0].addCls('pullTextVisible');
	    } else {
	        this.pullButton.enable();
	        Ext.ComponentQuery.query('#pullText')[0].removeCls('pullTextVisible');
	    }
	},

    redrawTree: function(record) {

        var tree = Ext.ComponentQuery.query('#capabilityGroupTree');
        if(tree && tree.length > 0) {
            tree[0].destroy();
        }

        this.drawTree(record);
    },

    drawTree: function(record) {
        this.add({
            xtype: 'rallytree',
            cls: 'capabilityGroupTree',
            itemId: 'capabilityGroupTree',
            topLevelModel: record.self.typePath,
            parentAttributeForChildRecordFn: function() {
                return 'PortfolioItem';
            },
            topLevelStoreConfig: {
                filters: [
                    {
                        property: 'ObjectID',
                        value: record.get('ObjectID')
                    }
                ],
                context: {
                    project: record.get('Project')._ref
                },
                fetch: ['Name', 'DirectChildrenCount', 'FormattedID', 'ObjectID', 'Project']
            },
            childItemsStoreConfigForParentRecordFn: function(){
                return {
                    sorters: []
                };
            },
            canExpandFn: function(record){
                return record.get('DirectChildrenCount') > 0;
            },
            treeItemConfigForRecordFn: function(){
                return {
                    xtype: 'gettytreeitem'
                };
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
});