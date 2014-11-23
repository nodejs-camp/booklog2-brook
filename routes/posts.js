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
	var model = req.app.db.model.Post;
	var title = req.query.title;
	var content = req.query.content;

	var post = new model({
		title: title,
		content: content
	});
	post.save();

	res.send({status: 'OK'});
};