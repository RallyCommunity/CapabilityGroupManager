Ext.define('GettyTreeItem', {
	extend: 'Rally.ui.tree.TreeItem',
	requires: ['Rally.ui.tree.TreeItem'],
	alias: 'widget.gettytreeitem',

    getPillTpl: function(){
	    var me = this;

	    return Ext.create('Ext.XTemplate',
	            '<div class="pill {[this.getSelectableCls()]}">',
	            '<tpl if="this.canDrag()"><div class="icon drag"></div></tpl>',
	            '<div class="textContent ellipses">{[this.getFormattedId()]} {[this.getType(values)]}{[this.getSeparator()]}{Name}</div>',
	            '<div class="rightSide">',
	            '{[this.getProject(values)]}',
	            '{[this.getPercentDone(values)]}',
	            '</div>',
	            '</div>',
	            {
	                getSelectableCls: function(){
	                    return me.getSelectable()? 'selectable': '';
	                },
	                canDrag: function(){
	                    return me.getCanDrag();
	                },
	                getFormattedId: function(){
	                    return me.getRecord().getField('FormattedID')? me.getRecord().render('FormattedID'): '';
	                },
	                getType: function(values){
	                    return values.PortfolioItemType? '(' + values.PortfolioItemType._refObjectName + ')': '';
	                },
	                getProject: function() {
	                	return '<div class="row-project">' + me.getRecord().render('Project') + '</div>';
	                },
	                getPercentDone: function(){
	                    return Ext.isDefined(me.getRecord().get('PercentDoneByStoryCount'))? me.getRecord().render('PercentDoneByStoryCount'): '';
	                },
	                getSeparator: function(){
	                    return this.getFormattedId()? ' - ': '';
	                }
	            }
	    );
	}
});