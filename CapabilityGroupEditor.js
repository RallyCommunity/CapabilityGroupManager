Ext.define('CapabilityGroupEditor', {
	extend: 'Ext.Container',
	alias: 'widget.capabilitygroupeditor',

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
	                labelWidth: 0
	            },
	            {
	                xtype: 'button',
	                itemId: 'addButton',
	                cls: 'addButton',
	                disabled: true,
	                text: 'Add'
	            },
	            {
	                xtype: 'component',
	                cls: 'saveText',
	                itemId: 'saveText'
	            }
	        ]
	    }
    ],

    initComponent: function(){
    	this.callParent(arguments);
    	this.dropdown = Ext.ComponentQuery.query('#capabilityGroupCombobox')[0];
    	Ext.ComponentQuery.query('#addButton')[0].on('click', this._onClickAddButton, this);
    },

    _onClickAddButton: function(){
    	var value = this.dropdown.getValue();
    	this.addCapabilityGroup(value);
    },

    addCapabilityGroup: function(value){
    	this.fireEvent('addCapabilityGroup', value);
    },

    removeCapabilityGroup: function(value) {
    	this.fireEvent('removeCapabilityGroup', value);
    },

    drawCapabilityGroups: function(capabilityGroups, mvfOwnerRef) {

        var capabilityGroupsComponent = Ext.ComponentQuery.query('#capabilityGroups')[0];
        capabilityGroupsComponent.removeAll();

        if(capabilityGroups.length <= 0) {
            return;
        }

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
                            change: function(checkbox, isChecked) {
                            	this._onCheckboxChange(checkbox, isChecked, capabilityGroup);
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

    _onCheckboxChange: function(checkbox, isChecked, capabilityGroup) {
        
        var currentCheckedCheckbox;
        Ext.Array.each(Ext.ComponentQuery.query('checkbox'), function(loopCheckbox){
        	if(loopCheckbox.getValue() === true && loopCheckbox != checkbox) {
        		currentCheckedCheckbox = loopCheckbox;
        	}
        }, this);

        if(!this.uncheckingPreviousCheckbox) {
        	this.fireEvent('mvfOwnerChange', isChecked ? capabilityGroup : null);
        }
        
    	if(currentCheckedCheckbox && !this.uncheckingPreviousCheckbox && currentCheckedCheckbox !== checkbox) {
    		this.uncheckingPreviousCheckbox = true;
    		currentCheckedCheckbox.setValue(false);
    	}

    	this.uncheckingPreviousCheckbox = false;
    },

    setSaveMessage: function(msg) {
    	Ext.ComponentQuery.query('#saveText')[0].getEl().setHTML(msg);
    }
});