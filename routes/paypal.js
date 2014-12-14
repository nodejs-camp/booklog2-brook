var events = require('events');
var express = require('express');
var router = express.Router();

// Paypal
var paypal_api = require('paypal-rest-sdk');

var config_opts = {
    'host': 'api.sandbox.paypal.com',
    'port': '',
    'client_id': 'AZmz8hA7zsgE3K0RWwJQZhJidC1WMXWXhfp36D5URJT0rGAWyS6r4XOO4mYd',
    'client_secret': 'EJ0oixCMhJrWRyfQSusRTBNrTwU7NW2IuL5EnbdqVypIak6V-VSnXUBVTXEi'
};

router.put('/1/post/:postId/pay', function(req, res, next) {
    var workflow = new events.EventEmitter();
    var postId = req.params.postId;
	var posts = req.app.db.model.Post;
    
    workflow.outcome = {
    	success: false
    };

    workflow.on('validate', function() {
        workflow.emit('createPayment');
    });

    workflow.on('createPayment', function() {
		paypal_api.configure(config_opts);

		var create_payment_json = {
		            intent: 'sale',
		            payer: {
		                payment_method: 'paypal'
		            },
		            redirect_urls: {

		                // http://localhost:3000/1/post/539eb886e8dbde4b39000007/paid?token=EC-4T17102178173001V&PayerID=QPPLBGBK5ZTVS
		                return_url: 'http://localhost:3000/1/post/' + postId + '/paid',
		                cancel_url: 'http://localhost:3000/1/post/' + postId + '/cancel'
		            },
		            transactions: [{
		                amount: {
		                    currency: 'TWD',
		                    total: 128
		                },
		                description: '購買教學文章'
		            }]
		};

		paypal_api.payment.create(create_payment_json, function (err, payment) {
		    if (err) {
		        workflow.err = err;
		        return workflow.emit('response');
		    }

		    if (!payment) {
			    return workflow.emit('response');
		    }

		    workflow.payment = payment;
		    workflow.emit('updatePost');
		});
    });

    workflow.on('updatePost', function() {
	    var order = {
	    	userId: req.user._id,
	    	paypal: workflow.payment
	    };

		posts
		.findByIdAndUpdate(postId, { $addToSet: { orders: order } }, function(err, post) {
			workflow.outcome.success = true;
			workflow.outcome.data = post;

			workflow.emit('response');
		});
    });

    workflow.on('response', function() {
    	return res.send(workflow.outcome);
    });

    return workflow.emit('validate');
});

router.get('/1/post/:postId/paid', function(req, res, next) {
    var workflow = new events.EventEmitter();
    var postId = req.params.postId;
	var posts = req.app.db.model.Post;
    var payerId = req.query.PayerID;
    var paymentId;
    
    workflow.outcome = {
    	success: false
    };

    workflow.on('validate', function() {
    	posts
    	.findOne({ _id: postId})
    	.exec(function(err, post) {
		    if (err) {
		        workflow.outcome.data = { error_description: err };
		        return workflow.emit('response');
		    }

		    if (!post) {
		    	/* product not exist */
		    	workflow.outcome.data = { error_description: 'product not exist' };
			    return workflow.emit('response');
		    }

		    workflow.paymentId = post.orders[0].paypal.id;

            workflow.emit('executePayment');
    	});
    });

    workflow.on('executePayment', function() {
		paypal_api.configure(config_opts);
		
        paypal_api.payment.execute(workflow.paymentId, { payer_id: payerId }, function (err, payment) {
		    if (err) {
		        workflow.outcome.data = { error_description: err };
		        return workflow.emit('response');
		    }

        	workflow.outcome.data = payment;
            workflow.emit('updatePost');
        });
    });

    workflow.on('updatePost', function() {
		posts
		.findByIdAndUpdate(postId, { $addToSet: { customers: req.user._id } }, function(err, post) {
			workflow.outcome.success = true;
			workflow.emit('response');
		});
    });

    workflow.on('response', function() {
    	return res.send(workflow.outcome);
    });

    return workflow.emit('validate');
});

module.exports = router;