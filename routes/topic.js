const express = require('express');
var router = express.Router();

const fs = require('fs');
const path = require('path');
// const url = require('url');
const sanitizeHtml = require('sanitize-html');
const template = require('../lib/template');



// 글쓰기(create)
router.get('/create', (req, res) => {
	var title = 'WEB - create';

	var list = template.list(req.list);
	var html = template.html(title, list, `
		<form action="/topic/create_process" method="post">
			<p>
				<input type="text" name="title" placeholder="title">
			</p>
			<p>
				<textarea name="description" placeholder="description"></textarea>
			</p>
			<p>
				<input type="submit">
			</p>
		</form>
	`, 
	'');

	res.send(html);
});


// 글쓰기 처리(create_process)
// 경로를 글쓰기와 똑같이 '/create'로 해도 된다 ==> 이 경우 request가 GET이면 '글쓰기'가 걸릴 것이고, POST이면 '글쓰기 처리'가 걸려서 처리된다.
router.post('/create_process', (req, res) => {
	// 미들웨어 body-parser 사용 후
	// 1) req.on("data", 콜백) 함수 불필요 <== POST로 데이터가 들어올 때마다 body 변수에 저장할 필요가 없으므로
	// 2) req.on("end", 콜백) 함수 불필요 <== POST 데이터가 다 들어오면 res로 응답하는 부분을 그냥 써주면 된다
	// 3) 폼 데이터를 파싱(URLSearchParams)할 필요없이 req.body로 참조할 수 있다. 
	var post = req.body;
	var title = post.title;
	var description = post.description;

	fs.writeFile(`./data/${title}`, description, 'utf-8', function(err) {
		if(err) throw err;

		res.redirect(302, `/topic/${encodeURI(title)}`);		// 방금 추가된 아이템 페이지로 redirection (301=영구이동, 302=임시이동), 한글일 때는 Location: `/?id=${encodeURI(title)}
	});		// fs.writeFile
});		// router.post




// 수정하기(/update)
router.get('/update/:updateId', (req, res) => {
	var { updateId } = req.params;
	// var queryData = url.parse(req.url, true);
	// console.log(updateId);

	var filteredId = path.parse(updateId).base;
	fs.readFile(`./data/${filteredId}`, 'utf-8', function(err, description) {
		var title = filteredId;
		
		var list = template.list(req.list);
		var html = template.html(title, list,
			`
			<form action="/topic/update_process" method="post">
				<p>
					<input type="hidden" name="id" value=${title}>															<!-- 수정 전 원래 title = id -->
					<input type="text" name="title" placeholder="title" value=${title}>					<!-- 수정 후 title = title -->
				</p>
				<p>
					<textarea name="description" placeholder="description">${description}</textarea>
				</p>
				<p>
					<input type="submit">
				</p>
			</form>
			`,
			`<a href="/topic/create">CREATE</a> <a href="/topic/update/${title}">UPDATE</a>`
		);

		res.send(html);
	});
});

// 수정 처리하기(/update_process)
router.post('/update_process', (req, res) => {
	// 미들웨어 사용 후
	var post = req.body;
	var id = post.id;
	var title = post.title;
	var description = post.description;

	fs.rename(`./data/${id}`, `./data/${title}`, function(error) {
		if(error) throw error;
		fs.writeFile(`./data/${title}`, description, 'utf8', function(err) {
			if(err) throw err;
			res.redirect(302, `/topic/${title}`);
		});	// fs.writeFile
	});	// fs.rename
});


// 삭제 처리하기(delete_process)
router.post('/delete_process', (req, res) => {
	// 미들웨어 사용 후
	var post = req.body;
	var id = post.id;
	var filteredId = path.parse(id).base;
	fs.unlink(`./data/${filteredId}`, function(err){
		res.redirect(302, `/`);
	});
});


// 아이템 페이지(HTML, CSS, JavaScript) (시맨틱 URL로 구성: http://localhost:3000/id?HTML ==> http://localhost:3000/page/HTML)
// 주의: http://localhost:3000/page 	==> 현재 라우트로 들어오지 않는다(Cannot GET /page)
// 주의: http://localhost:3000/page/ 	==> 현재 라우트로 들어오지 않는다(Cannot GET /page/)	==> <결론> pageId에는 undefined가 들어올 수 없다
router.get('/:pageId', (req, res, next) => {
	var { pageId } = req.params;									// req.params = { pageId: 'html' }, req.params 객체의 속성 이름과 변수 이름이 일치해야한다. (일치하지 않으면 없는 속성이라서 undefined)
	// console.log(`pageId=${pageId}`);						// http://localhost:3000/page/html2 ==> pageId = 'html2'

	var filteredId = path.parse(pageId).base;			// '../password.txt' ==> 'password.txt'
	fs.readFile(`./data/${filteredId}`, 'utf-8', (err, description) => {

		// http://localhost:3000/page/CSS1 으로 접속했는데 ./data/CSS1 파일이 없다면 ==> err에 에러 들어옴
		if(err) {
			console.log("/topic/:pageId에서 에러 발생");
			next(err);		// err 처리용 미들웨어(맨끝)로 직행: 예를 들어 'http://localhost:3000/page/22'로 접속한 경우 ==> Error: ENOENT: no such file or directory, open './data/22'
		} else {
			var title = pageId;
			var sanitizedTitle = sanitizeHtml(title);
			var sanitizedDescription = sanitizeHtml(description, {
				allowedTags: ['h1']
			});
			
			var list = template.list(req.list);
			var html = template.html(title, list, 
				`<h2>${sanitizedTitle}</h2>
				${sanitizedDescription}`, 
				`
				<a href="/topic/create">CREATE</a> 
				<a href="/topic/update/${sanitizedTitle}">UPDATE</a> 
				<form action="/topic/delete_process" method="post" onsubmit="alert('${sanitizedTitle}항목을 삭제하시겠습니까?');">
					<input type="hidden" name="id" value="${sanitizedTitle}">
					<input type="submit" value="delete">
				</form>
				`
			);															// delete를 GET방식으로 링크를 드러내서는 안 되므로 POST방식으로 하기 위해 form 사용
			res.send(html);
		}
	});
});

module.exports = router;
