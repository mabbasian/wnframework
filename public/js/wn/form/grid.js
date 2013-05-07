wn.ui.form.Grid = Class.extend({
	init: function(opts) {
		$.extend(this, opts);
		this.fieldinfo = {};
		this.docfields = wn.meta.docfield_list[this.df.options];
		this.docfields.sort(function(a, b)  { return a.idx > b.idx ? 1 : -1 });
	},
	make: function() {
		var me = this;
		
		this.wrapper = $('<div>\
		<div class="panel">\
			<div class="panel-heading" style="font-size: 15px;"></div>\
			<div class="rows"></div>\
			<div style="margin-top: 5px; margin-bottom: -5px;">\
				<a href="#" class="grid-add-row">+ '+wn._("Add new row")+'.</a>\
				<span class="text-muted">Click on row to edit.</span></div>\
		</div>\
		</div>').appendTo(this.parent);

		$(this.wrapper).find(".grid-add-row").click(function() {
			wn.model.add_child(me.frm.doc, me.df.options, me.df.fieldname);
			me.refresh();
			me.wrapper.find(".grid-row:last").data("grid_row").toggle_view(true);
			return false;
		})
		
	},
	make_head: function() {
		// labels
		new wn.ui.form.GridRow({
			parent: $(this.parent).find(".panel-heading"),
			parent_df: this.df,
			docfields: this.docfields,
			frm: this.frm,
			grid: this
		});	
	},
	refresh: function() {
		!this.wrapper && this.make();
		var me = this,
			$rows = $(me.parent).find(".rows"),
			data = this.get_data();	
		
		this.display_status = wn.perm.get_field_display_status(this.df, this.frm.doc, 
			this.perm);

		if(this.data_rows_are_same(data)) {
			// soft refresh
			$.each(this.grid_rows, function(i, g) {
				g.refresh();
			});
		} else {
			// redraw
			this.wrapper.find(".grid-row").remove();
			this.make_head();
			this.grid_rows = [];
			this.grid_rows_by_docname = {};
			$.each(data || [], function(ri, d) {
				var grid_row = new wn.ui.form.GridRow({
					parent: $rows,
					parent_df: me.df,
					docfields: me.docfields,
					doc: d,
					frm: me.frm,
					grid: me
				});
				me.grid_rows.push(grid_row)
				me.grid_rows_by_docname[d.name] = grid_row;
			});

			this.wrapper.find(".grid-add-row").toggle(this.display_status=="Write" 
				&& !this.static_rows);
			if(this.display_status=="Write" && !this.static_rows) {
				this.make_sortable($rows);
			}

			this.last_display_status = this.display_status;
			this.last_docname = this.frm.docname;
		}
	},
	refresh_row: function(docname) {
		this.grid_rows_by_docname[docname] && 
			this.grid_rows_by_docname[docname].refresh();
	},
	data_rows_are_same: function(data) {
		if(this.grid_rows) {
			var same = data.length==this.grid_rows.length 
				&& this.display_status==this.last_display_status
				&& this.frm.docname==this.last_docname
				&& !$.map(this.grid_rows, function(g, i) {
					return g.doc.name==data[i].name ? null : true;
				}).length; 
				
			return same;
		}
	},
	make_sortable: function($rows) {
		var me =this;
		$rows.sortable({
			update: function(event, ui) {
				$rows.find(".grid-row").each(function(i, item) {
					var doc = $(item).data("doc");
					doc.idx = i + 1;
					$(this).find(".row-index").html(i + 1);
					me.frm.dirty();
				})
			}
		});
	},
	get_data: function() {
		var data = wn.model.get(this.df.options, {
			"parenttype": this.frm.doctype, 
			"parentfield": this.df.fieldname,
			"parent": this.frm.docname
		});
		data.sort(function(a, b) { return a.idx > b.idx ? 1 : -1 });
		return data;
	},
	set_column_disp: function() {
		// return
	},
	get_field: function(fieldname) {
		if(!this.fieldinfo[fieldname])
			this.fieldinfo[fieldname] = {}
		return this.fieldinfo[fieldname];
	},
	set_value: function(fieldname, value, doc) {
		this.grid_rows_by_docname[doc.name].set_value(fieldname, value);
	}
});

wn.ui.form.GridRow = Class.extend({
	init: function(opts) {
		$.extend(this, opts);
		this.show = false;
		this.make();
	},
	make: function() {
		var me = this;
		this.wrapper = $('<div class="grid-row">\
			<div class="data-row" style="min-height: 15px;"></div>\
			<div class="panel panel-warning" style="display: none;">\
				<div class="panel-heading">\
					<div class="toolbar" style="height: 36px;">\
						Editing Row #<span class="row-index"></span>\
						<button class="btn btn-success pull-right" \
							title="'+wn._("Close")+'"\
							style="margin-left: 7px;">\
							<i class="icon-ok"></i></button>\
						<button class="btn pull-right grid-insert-row" \
							title="'+wn._("Insert Row")+'"\
							style="margin-left: 7px;">\
							<i class="icon-plus"></i></button>\
						<button class="btn btn-danger pull-right"\
							title="'+wn._("Delete Row")+'"\
							><i class="icon-trash"></i></button>\
					</div>\
				</div>\
				<div class="form-area"></div>\
			</div>\
			<div class="divider row"></div>\
		</div>')
			.appendTo(this.parent)
			.data("grid_row", this);

		if(this.doc) {
			this.wrapper
				.attr("data-idx", this.doc.idx)
				.find(".row-index").html(this.doc.idx)

			this.wrapper.find(".data-row, .panel-heading")
				.click(function() {
					me.toggle_view();
					return false;
				});
			this.set_button_events();
		}
		this.form_panel = this.wrapper.find(".panel");
		this.row = this.wrapper.find(".data-row");
		this.form_area = this.wrapper.find(".form-area");

		this.make_columns();
		if(this.doc) {
			this.set_data();
		}
	},
	set_button_events: function() {
		var me = this;
				
		this.wrapper.find(".btn-danger").click(function() {
			me.wrapper.fadeOut(function() {
				wn.model.clear_doc(me.doc.doctype, me.doc.name);
				me.frm.dirty();
				me.grid.refresh();
			});
			return false;
		});
		
		this.wrapper.find(".grid-insert-row").click(function() {
			var idx = me.doc.idx;
			me.toggle_view(false);
			wn.model.add_child(me.frm.doc, me.grid.df.options, me.grid.df.fieldname, 
				me.doc.idx);
			me.grid.refresh();
			me.grid.wrapper.find("[data-idx='"+idx+"']").data("grid_row").toggle_view(true);
			return false;
		})
	},
	refresh: function() {
		this.doc = locals[this.doc.doctype][this.doc.name];
		
		// re write columns
		this.make_columns();
		
		// refersh form fields
		if(this.show) {
			$.each(this.fields, function(i, f) {
				f.refresh();
			});
		} 
	},
	make_columns: function() {
		var me = this,
			total_colsize = 1;
		me.row.empty();
		col = $('<div class="col-span-1 row-index">' + (me.doc ? me.doc.idx : "#")+ '</div>')
			.appendTo(me.row)
		$.each(me.docfields, function(ci, df) {
			if(!df.hidden && !df.print_hide && me.grid.frm.perm[df.permlevel][READ]) {
				var colsize = 2,
					txt = me.doc ? 
						wn.format(me.doc[df.fieldname], df, null, me.doc) : 
						df.label;
				switch(df.fieldtype) {
					case "Text":
						colsize = 3;
						break;
					case "Check":
						colsize = 1;
						break;
				}
				total_colsize += colsize
				if(total_colsize > 12) 
					return false;
				$col = $('<div class="col-span-'+colsize+'">' 
					+ txt + '</div>')
					.css({
						"overflow": "hidden",
						"text-overflow": "ellipsis",
						"white-space": "nowrap",
						"padding-right": "0px"
					})
					.attr("data-fieldname", df.fieldname)
					.data("df", df)
					.appendTo(me.row)
				if(in_list(["Int", "Currency", "Float"], df.fieldtype))
					$col.css({"text-align": "right"})
			}
		});
	},
	toggle_view: function(show) {
		this.doc = locals[this.doc.doctype][this.doc.name];
		// hide other
		var open_row = $(".grid-row-open").data("grid_row"),
			me = this;

		this.fields = [];
		this.fields_dict = {};
		
		open_row && open_row != this && open_row.toggle_view(false);
		
		this.show = show===undefined ? 
			show = !this.show :
			show

		this.make_columns();
		this.wrapper.toggleClass("grid-row-open", this.show);

		this.show && this.render_form()
		this.show && this.row.toggle(false);

		this.form_panel.slideToggle(this.show, function() {
			if(!me.show) {
				$(me.form_area).empty();
				me.row.toggle(true);
			}
		});
	},
	render_form: function() {
		var me = this,
			cnt = 0,
			row = $('<div class="row">').appendTo(me.form_area),
			col1 = $('<div class="col-span-6"></div>').appendTo(row),
			col2 = $('<div class="col-span-6"></div>').appendTo(row),
			len = $.map(me.docfields, function(d) { 
				return !d.hidden ? true : null }).length;

		len = (len + len % 2) / 2;
		
		$.each(me.docfields, function(ci, df) {
			if(!df.hidden) {
				var fieldwrapper = $('<div>')
					.appendTo(ci <= len ? col1 : col2)
				var fieldobj = make_field(df, me.parent_df.options, 
					fieldwrapper.get(0), me.frm);
				fieldobj.docname = me.doc.name;
				fieldobj.refresh();
				fieldobj.input &&
					$(fieldobj.input).css({"max-height": "100px"});
					
				// set field properties
				// used for setting custom get queries in links
				if(me.grid.fieldinfo[df.fieldname])
					$.extend(fieldobj, me.grid.fieldinfo[df.fieldname]);

				me.fields.push(fieldobj);
				me.fields_dict[df.fieldname] = fieldobj;
				cnt++;
			}
		});

		if(this.grid.display_status!="Write" || this.grid.static_rows) {
			this.wrapper.find(".btn-danger, .grid-insert-row").toggle(false);
			return;
		}
	},
	set_data: function() {
		this.wrapper.data({
			"doc": this.doc
		})
	},
	set_value: function(fieldname, value) {
		// in row
		var $col = this.row.find("[data-fieldname='"+fieldname+"']");
		$col.length && $col.html(wn.format(value, $col.data("df"), null, this.doc));
		
		// in form
		if(this.fields_dict && this.fields_dict[fieldname]) {
			this.fields_dict[fieldname].set_input(value);
		}
	},
	refresh_field: function(fieldname) {
		var $col = this.row.find("[data-fieldname='"+fieldname+"']");
		if($col.length) {
			var value = wn.model.get_value(this.doc.doctype, this.doc.name, fieldname);
			$col.html(wn.format(value, $col.data("df"), null, this.doc));
		}
		
		// in form
		if(this.fields_dict && this.fields_dict[fieldname]) {
			this.fields_dict[fieldname].refresh();
		}	
	},	
});