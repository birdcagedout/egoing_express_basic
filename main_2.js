// 생활코딩(egoing)님의 WEB3 Express 강의
// 
// 블로그: https://opentutorials.org/module/3590
// 유튜브: https://www.youtube.com/playlist?list=PLuHgQVnccGMAGOQu8CBDO9hn-FXFmm4Wp
//
// Semantic URL: URL에 ?가 들어간 쿼리 스트링을 사용하기보다 가독성이 좋은 계층적 Path로 URL를 구성하는 방법
// ex. http://localhost:3000/topic?id=0 ==> http://localhost:3000/topic/0
//
// 2단계. Express + 미들웨어 처음 맛보기(body-parser)

const fs = require('fs');
const path = require('path');
const url = require('url');
const sanitizeHtml = require('sanitize-html');
const template = require('./lib/template.js');


const express = require('express');
const app = express();
const port = 3000;


// 미들웨어(body-Parser) 사용
// app.use(미들웨어 부분), 사용자의 요청이 들어올 때마다 미들웨어 작동함
const bodyParser = require('body-parser');

// (클라이언트의) 폼 데이터 요청에 대해서 사용
// 이제 app.post(경로, (req, res){})의 req 객체에는 (전에는 없었던) body라는 프로퍼티가 생긴다
app.use(bodyParser.urlencoded({extended: false}));

// json 요청에 대해서 사용
// app.use(bodyParser.json());







// 홈(/)
app.get('/', (req, res) => {
	fs.readdir('data', function(err, fileList) {		// fileList = [ 'CSS', 'HTML', 'JavaScript' ]
		var title = 'Welcome';
		var description = 'Hello, node.js';

		var list = template.list(fileList);
		var html = template.html(title, list, `<h2>${title}</h2>${description}`, `<a href="/create">create</a>`);

		res.send(html);
	});
});


// 아이템 페이지(HTML, CSS, JavaScript) (시맨틱 URL로 구성: http://localhost:3000/id?HTML ==> http://localhost:3000/page/HTML)
// 주의: http://localhost:3000/page 	==> 현재 라우트로 들어오지 않는다(Cannot GET /page)
// 주의: http://localhost:3000/page/ 	==> 현재 라우트로 들어오지 않는다(Cannot GET /page/)	==> <결론> pageId에는 undefined가 들어올 수 없다
app.get('/page/:pageId', (req, res) => {
	var { pageId } = req.params;								// req.params = { pageId: 'html' }, req.params 객체의 속성 이름과 변수 이름이 일치해야한다. (일치하지 않으면 없는 속성이라서 undefined)
	console.log(`pageId=${pageId}`);						// http://localhost:3000/page/html2 ==> pageId = 'html2'

	fs.readdir('data', function(err, fileList) {		// fileList = [ 'CSS', 'HTML', 'JavaScript' ]

		var filteredId = path.parse(pageId).base;			// '../password.txt' ==> 'password.txt'
		fs.readFile(`./data/${filteredId}`, 'utf-8', (err, description) => {
			var title = pageId;
			var sanitizedTitle = sanitizeHtml(title);
			var sanitizedDescription = sanitizeHtml(description, {
				allowedTags: ['h1']
			});
			
			var list = template.list(fileList);
			var html = template.html(title, list, 
				`<h2>${sanitizedTitle}</h2>
				${sanitizedDescription}`, 
				`
				<a href="/create">CREATE</a> 
				<a href="/update/${sanitizedTitle}">UPDATE</a> 
				<form action="/delete_process" method="post" onsubmit="alert('${sanitizedTitle}항목을 삭제하시겠습니까?');">
					<input type="hidden" name="id" value="${sanitizedTitle}">
					<input type="submit" value="delete">
				</form>
				`
				);															// delete를 GET방식으로 링크를 드러내서는 안 되므로 POST방식으로 하기 위해 form 사용

			res.send(html);
		});
	});
});


// 글쓰기(create)
app.get('/create', (req, res) => {
	fs.readdir('data', function(err, fileList) {
		// console.log(fileList);					// [ 'CSS', 'HTML', 'JavaScript' ]
		var title = 'WEB - create';

		var list = template.list(fileList);
		var html = template.html(title, list, `
			<form action="/create_process" method="post">
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
});


// 글쓰기 처리(create_process)
// 경로를 글쓰기와 똑같이 '/create'로 해도 된다 ==> 이 경우 request가 GET이면 '글쓰기'가 걸릴 것이고, POST이면 '글쓰기 처리'가 걸려서 처리된다.
app.post('/create_process', (req, res) => {

	/* 미들웨어 body-parser 사용 전
	// POST로 전송된 data 처리
	var body = '';

	// 서버가 POST data를 (조각조각 순차적으로) 수신할 때마다 호출되는 event listener
	req.on('data', function(data) {
		body += data;

		// 너무 큰(대략 1MB) 데이터가 들어왔을 때 접속을 끊어버리는 예방장치
		if(data.length > 1e6) req.socket.destroy();
	});

	// 서버에 더이상 들어오는 data가 없으면 정보수신이 끝났으므로 이때 호출되는 event listener
	req.on('end', function(data) {
		// var post = qs.parse(body);
		var post = new URLSearchParams(body);		// querystring의 대체재. native라서 모듈 불러올 필요 없다.
		console.log(post);											// URLSearchParams { 'title' => 'Nest.js', 'description' => '네스트가 뭐야 쒸벨' }

		var title = post.get('title');
		var description = post.get('description');
		console.log(`title=${title}, description=${description}`);
		fs.writeFile(`./data/${title}`, description, 'utf-8', function(err) {
			if(err) throw err;

			res.redirect(302, `/page/${encodeURI(title)}`);		// 방금 추가된 아이템 페이지로 redirection (301=영구이동, 302=임시이동), 한글일 때는 Location: `/?id=${encodeURI(title)}
		});		// fs.writeFile
	});		// req.on
	*/


	// 미들웨어 body-parser 사용 후
	// 1) req.on("data", 콜백) 함수 불필요 <== POST로 데이터가 들어올 때마다 body 변수에 저장할 필요가 없으므로
	// 2) req.on("end", 콜백) 함수 불필요 <== POST 데이터가 다 들어오면 res로 응답하는 부분을 그냥 써주면 된다
	// 3) 폼 데이터를 파싱(URLSearchParams)할 필요없이 req.body로 참조할 수 있다. 
	var post =  req.body;
	var title = post.title;
	var description = post.description;

	fs.writeFile(`./data/${title}`, description, 'utf-8', function(err) {
		if(err) throw err;

		res.redirect(302, `/page/${encodeURI(title)}`);		// 방금 추가된 아이템 페이지로 redirection (301=영구이동, 302=임시이동), 한글일 때는 Location: `/?id=${encodeURI(title)}
	});		// fs.writeFile
});		// app.post


// 수정하기(/update)
app.get('/update/:updateId', (req, res) => {
	var { updateId } = req.params;
	// var queryData = url.parse(req.url, true);
	console.log(updateId);

	fs.readdir('data', function(err, fileList) {					// fileList = [ 'CSS', 'HTML', 'JavaScript' ]

		var filteredId = path.parse(updateId).base;
		fs.readFile(`./data/${filteredId}`, 'utf-8', function(err, description) {
			var title = filteredId;
			
			var list = template.list(fileList);
			var html = template.html(title, list,
				`
				<form action="/update_process" method="post">
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
				`<a href="/create">create</a> <a href="/update/${title}">update</a>`
			);

			res.send(html);
		});
	});
});


// 수정 처리하기(/update_process)
app.post('/update_process', (req, res) => {

	/* 미들웨어 사용 전
	// POST로 전송된 data 처리
	var body = '';

	// 서버가 POST data를 (조각조각 순차적으로) 수신할 때마다 호출되는 event listener
	req.on('data', function(data) {
		body += data;

		// 너무 큰(대략 1MB) 데이터가 들어왔을 때 접속을 끊어버리는 예방장치
		if(data.length > 1e6) req.socket.destroy();
	});

	// 서버에 더이상 들어오는 data가 없으면 정보수신이 끝났으므로 이때 호출되는 event listener
	req.on('end', function(data) {
		// var post = qs.parse(body);
		var post = new URLSearchParams(body);
		console.log(post);

		var id = post.get('id');
		var title = post.get('title');
		var description = post.get('description');


		fs.rename(`./data/${id}`, `./data/${title}`, function(error) {
			if(error) throw error;
			fs.writeFile(`./data/${title}`, description, 'utf8', function(err) {
				if(err) throw err;
				res.redirect(302, `/page/${title}`);
			});	// fs.writeFile
		});	// fs.rename
	});	// req.on('end')
	*/


	// 미들웨어 사용 후
	var post = req.body;
	var id = post.id;
	var title = post.title;
	var description = post.description;

	fs.rename(`./data/${id}`, `./data/${title}`, function(error) {
		if(error) throw error;
		fs.writeFile(`./data/${title}`, description, 'utf8', function(err) {
			if(err) throw err;
			res.redirect(302, `/page/${title}`);
		});	// fs.writeFile
	});	// fs.rename

});


// 삭제 처리하기(delete_process)
app.post('/delete_process', (req, res) => {

	/* 미들웨어 사용 전
	// POST로 전송된 data 처리
	var body = '';

	// 서버가 POST data를 (조각조각 순차적으로) 수신할 때마다 호출되는 event listener
	req.on('data', function(data) {
		body += data;

		// 너무 큰(대략 1MB) 데이터가 들어왔을 때 접속을 끊어버리는 예방장치
		if(data.length > 1e6) req.socket.destroy();
	});

	// 서버에 더이상 들어오는 data가 없으면 정보수신이 끝났으므로 이때 호출되는 event listener
	req.on('end', function(data) {
		// var post = qs.parse(body);
		var post = new url.URLSearchParams(body);
		// console.log(post);					//  [Object: null prototype] { title: 'node.js', description: '노드가 짱짱맨' }

		var id = post.get('id');
		var filteredId = path.parse(id).base;
		fs.unlink(`./data/${filteredId}`, function(err){
			res.redirect(302, `/`);
		});
	});
	*/ 

	
	// 미들웨어 사용 후
	var post = req.body;
	var id = post.id;
	var filteredId = path.parse(id).base;
	fs.unlink(`./data/${filteredId}`, function(err){
		res.redirect(302, `/`);
	});

});



// 모든 경로에서 처리가 끝난 후에도 걸린 게 없는 경우 ==> ERROR 페이지 로드 404
app.use( (req, res, next) => {
  res.status(404).send('<h1>404<p>Page Not Found</h1>');
});



// 서버 시작
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});


