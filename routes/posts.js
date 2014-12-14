var events = require('events');

exports.list = function(req, res){
	var workflow = new events.EventEmitter();
	var model = req.app.db.model.Post;

	workflow.outcome = {
		success: false,
		errfor: {}
	};

    workflow.on('validation',function(){
        if (model) {
            return workflow.emit('aggregation');
        } else {
            workflow.outcome.errfor = { error_description: 'their is no model' };
            return workflow.emit('response');
        }
    });

    workflow.on('aggregation',function(){
        model.aggregate([
            {
                $project: {
                    _id : 1,
                    userId : 1,
                    title : 1,
                    content : 1,
                    orders : 1,
                    customers : 1,
                    timeCreated : 1,
                    granted : 1
                }
            }
        ])
        .exec(function(err, posts) {
            workflow.posts = posts;		//將post傳遞到workflow的全域變數
            workflow.emit('populate');
        });
    });

    workflow.on('populate',function(){
        model.populate(workflow.posts, {path: 'userId'}, function(err, posts) {

        	if(err){
            	workflow.outcome.errfor = { error_description: 'populate fail' };
	            return workflow.emit('response');
			}

            for ( i = 0; i < posts.length ; i++) {
                posts[i].wchars = model.count(posts[i].content);

                var uid;
                for (j = 0; j < posts[i].customers.length; j++) {
                    uid = '' + posts[i].customers[j];
                    if (uid === req.user._id) posts[i].granted = true;
                }
            }
            workflow.outcome.posts = posts;
            workflow.outcome.success = true;
            return workflow.emit('response');
        });
    });

    workflow.on('response',function(){
        res.send(workflow.outcome);
    });

    return workflow.emit('validation');
};

exports.listByTag = function(req, res){
	var model = req.app.db.model.Post;
	var tag = req.params.tag;

  	model
  	  //.find( { title: tag } )
  		.find( { $text: { $search: tag } })
  		.populate('userId')
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
	var title = req.body.title;
	var content = req.body.content;
	var userId = req.user._id;

	workflow.outcome = {
		success: false,
		errfor: {}
	};

	workflow.on('validation', function() {
		if (title.length === 0) 
			workflow.outcome.errfor.title = '這是必填欄位';

		if (content.length === 0) 
			workflow.outcome.errfor.content = '這是必填欄位';

		if (Object.keys(workflow.outcome.errfor).length !== 0)
			return workflow.emit('response');

		workflow.emit('savePost');
	});

	workflow.on('savePost', function() {
		var post = new model({
			userId: userId,
			title: title,
			content: content
		});
		post.save();

		workflow.outcome.success = true;

		workflow.emit('response');
	});

	workflow.on('response', function() {
		res.send(workflow.outcome);
	});

	workflow.emit('validation');
};