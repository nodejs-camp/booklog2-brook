var events = require('events');

exports.list = function(req, res){
	var model = req.app.db.model.Post;
	
  	model
  		.find({})
  		.exec(function(err, posts) {
		  	res.send({
		  		posts: posts
		  	});
		  	res.end();
  		});
};

exports.create = function(req, res){
	var workflow = new events.EventEmitter();
	var model = req.app.db.model.Post;
	var title = req.query.title;
	var content = req.query.content;

	workflow.on('validation', function() {

		if (hasError) workflow.emit('response');

		workflow.emit('savePost');
	});

	workflow.on('savePost', function() {
		var post = new model({
			title: title,
			content: content
		});
		post.save();

		workflow.emit('response');
	});

	workflow.on('response', function() {
	});
};