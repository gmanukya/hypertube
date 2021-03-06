const express = require('express');
const nodemailer = require('nodemailer');
const randomstring = require("randomstring");
const bcrypt = require('bcrypt');
const router = express.Router();
var mongo = require('../../../mongo');
const transporter = require('../../../src/mailer');


router.post('/', function(req, res, next) {
	if (req.session && req.session._id) {
		res.sendStatus(300);
	}
	else {
		const post = req.body;
		var db = mongo.getDb();
		const collection = db.collection('users');

		if (!post.login) {
			res.status(300).json({login: 'default'});
		}
		else {
			collection.findOne(
				{ $or:
					[
						{email: {$regex: new RegExp("^" + post.login + "$", "i")}},
						{login: {$regex: new RegExp("^" + post.login + "$", "i")}}
					]
				}, function (err, result) {
					if (err) throw err

					if (!result) {
						res.status(300).json({login: 'incorrect'});
					}
					else if (!result.email) {
						res.status(300).json({login: 'noMail'});
					}
					else {
						const newPassword = randomstring.generate(7) + Math.floor(Math.random() * Math.floor(500));

						let mailOptions = {
							from: '"Jean Marc Morandini" <ericnicogor@gmail.com>',
							to: result.email,
							subject: 'Hypertube - Nouveau mot de passe',
							text: 'Voici ton nouveau mot de passe : ' + newPassword,
							html: '<b>Voici ton nouveau mot de passe : </b>' + newPassword
						};

						transporter.sendMail(mailOptions, (error, info) => {
							if (error) throw error;

							bcrypt.genSalt(10, function(err, salt) {
								bcrypt.hash(newPassword, salt, function(err, hash) {
									collection.update(
										{ $or: [ {email: post.login}, {login: post.login} ] },
										{ $set: {password: hash}}, function (err, result) {
											if (err) throw err;
											res.sendStatus(202);
										}
									);
								});
							});
						});
					}
				}
			);
		}
	}
});


module.exports = router;
