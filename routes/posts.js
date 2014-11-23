exports.list = function(req, res){
	var model = req.app.db.model.Post;

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
};