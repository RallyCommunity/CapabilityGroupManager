Ext.define('CapabilityGroupCombobox', {
	extend: 'Rally.ui.combobox.ComboBox',
    alias: 'widget.capabilitygroupcombobox',

    constructor: function(config) {
        var defaultConfig = {
            stateful: false,
            fieldLabel: 'Capability Group',
            labelWidth: 95,
            labelClsExtra: 'rui-label',
            storeConfig: {
                autoLoad: true,
                model: 'Project',
                sorters: {
                    property: 'Name',
                    direction: 'ASC'
                },
                filters: [
                    {
                        property: 'Name',
                        operator: 'Contains',
                        value: 'MVF Backlog'
                    }
                ]
            }
        };

        this.callParent([Ext.Object.merge(defaultConfig, config)]);
    }

});