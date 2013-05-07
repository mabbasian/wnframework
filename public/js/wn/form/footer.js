wn.ui.form.Footer = Class.extend({
	init: function(opts) {
		var me = this;
		$.extend(this, opts);
		this.make();
		this.make_attachments();
		this.make_comments();
		// render-complete
		$(this.frm.wrapper).on("render_complete", function() {
			me.refresh();
		})
	},
	make: function() {
		this.wrapper = $('<div class="form-footer row">\
			<!--i class="icon-cut" style="margin-top: -23px; margin-bottom: 23px; \
				display: block; margin-left: 15px; color: #888;"></i-->\
			<div class="col-span-12">\
				<div class="save-area">\
					<button class="btn btn-save btn-primary">\
						<i class="icon-save"></i> Save</button>\
				</div>\
				<div class="help-area"></div>\
			</div>\
			<div class="col-span-8">\
				<div class="form-comments">\
					<h4><i class="icon-comments"></i> Comments</h4>\
				</div>\
			</div>\
			<div class="col-span-4">\
				<div class="form-attachments">\
					<h5><i class="icon-paper-clip"></i> Attachments</h5>\
				</div>\
			</div>\
		</div>')
			.appendTo(this.parent);
		this.wrapper.find(".btn-save").click(function() {
			me.frm.save('Save', null, this);
		})
		this.help_area = this.wrapper.find(".help-area").get(0);
	},
	make_attachments: function() {
		this.frm.attachments = new wn.ui.form.Attachments({
			parent: this.wrapper.find(".form-attachments"), 
			frm: this.frm
		});
	},
	make_comments: function() {
		this.frm.comments = new wn.ui.form.Comments({
			parent: this.wrapper.find(".form-comments"),
			frm: this.frm
		})
	},
	show_save: function() {
		this.wrapper.find(".save-area").toggle(true);
	},
	hide_save: function() {
		this.wrapper.find(".save-area").toggle(false);
	},
	refresh: function() {
		this.toggle_save();
		this.frm.attachments.refresh();
		this.frm.comments.refresh();
		// show save?
	},
	toggle_save: function() {
		if(this.frm_head && this.appframe.toolbar
			&& this.appframe.buttons.Save && !this.save_disabled
			&& (this.fields && this.fields.length > 7)) {
			this.show_save();
		} else {
			this.hide_save();
		}
	}
});