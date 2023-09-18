const express = require('express');
var router = express.Router();

const template = require('../lib/template');

// 홈(/)
router.get('/', (req, res) => {
	var title = 'Welcome';
	var description = 'Hello, node.js';

	var list = template.list(req.list);
	var html = template.html(title, list, 
		`
		<h2>${title}</h2>${description}
		<img src='/images/hello.jpg' style='width: 600px; display:block; margin:10px 0;'>
		`, 
		`<a href="/topic/create">CREATE</a>`
	);

	res.send(html);
});


module.exports = router;