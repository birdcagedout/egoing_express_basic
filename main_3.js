// 생활코딩(egoing)님의 WEB3 Express 강의
// 
// 블로그: https://opentutorials.org/module/3590
// 유튜브: https://www.youtube.com/playlist?list=PLuHgQVnccGMAGOQu8CBDO9hn-FXFmm4Wp
//
// Semantic URL: URL에 ?가 들어간 쿼리 스트링을 사용하기보다 가독성이 좋은 계층적 Path로 URL를 구성하는 방법
// ex. http://localhost:3000/topic?id=0 ==> http://localhost:3000/topic/0
//
// 3단계. Express + 미들웨어 2개 쓰기(body-parser, compression) ==> 라우팅 적용 전까지


const fs = require('fs');
const path = require('path');
const url = require('url');
const sanitizeHtml = require('sanitize-html');
const template = require('./lib/template.js');
const helmet = require('helmet');


const express = require('express');
const app = express();
const port = 3000;


// 보안 기본 설정
app.use(helmet());


// 미들웨어(body-Parser) 사용 1. body-parser
// app.use(미들웨어 부분), 사용자의 요청이 들어올 때마다 미들웨어 작동함
const bodyParser = require('body-parser');

// (클라이언트의) 폼 데이터 요청에 대해서 사용
// 이제 app.post(경로, (req, res){})의 req 객체에는 (전에는 없었던) body라는 프로퍼티가 생긴다
app.use(bodyParser.urlencoded({extended: false}));

// json 요청에 대해서 사용
// app.use(bodyParser.json());



// 미들웨어(body-Parser) 사용 2. compression ==> 67.5KB -> 5KB
const compression = require('compression');
app.use(compression());


// 미들웨어 작성: 미들웨어는 "함수"이다. ==> https://expressjs.com/ko/guide/writing-middleware.html
// 매번 ./data 읽어서 파일 목록 가져오는 부분을 미들웨어로 만들어본다.

// 버전1. 모든 요청(GET. POST)에 대해서 파일목록을 가져오는 IO를 처리하는 것은 비효율적 (POST 요청에 대해서는 파일목록을 가져올 필요가 없다)
// app.use(function(req, res, next) {

// 버전2. 따라서 모든 GET 요청인 경우에만 파일목록을 가져오는 미들웨어를 작동시킨다
app.get("*", function(req, res, next) {
	fs.readdir('./data', function(err, fileList) {	// fileList = [ 'CSS', 'HTML', 'JavaScript' ]
		req.list = fileList;
		next();
	});
});



// 정적 파일(jpg, html, js 등) 사용
// 마운트 경로를 지정하지 않으면 해당 폴더('public')가 '/'에 마운트된다 
app.use(express.static('public'));		// http://localhost:3000/images/hello.jpg




// 홈(/)
app.get('/', (req, res) => {
	var title = 'Welcome';
	var description = 'Hello, node.js';

	var list = template.list(req.list);
	var html = template.html(title, list, 
		`<h2>${title}</h2>${description}<img src='/images/hello.jpg' style='width: 600px; display:block; margin:10px 0;'>`, 
		`<a href="/create">create</a>`);

	res.send(html);
});


// 아이템 페이지(HTML, CSS, JavaScript) (시맨틱 URL로 구성: http://localhost:3000/id?HTML ==> http://localhost:3000/page/HTML)
// 주의: http://localhost:3000/page 	==> 현재 라우트로 들어오지 않는다(Cannot GET /page)
// 주의: http://localhost:3000/page/ 	==> 현재 라우트로 들어오지 않는다(Cannot GET /page/)	==> <결론> pageId에는 undefined가 들어올 수 없다
app.get('/page/:pageId', (req, res, next) => {
	var { pageId } = req.params;								// req.params = { pageId: 'html' }, req.params 객체의 속성 이름과 변수 이름이 일치해야한다. (일치하지 않으면 없는 속성이라서 undefined)
	// console.log(`pageId=${pageId}`);						// http://localhost:3000/page/html2 ==> pageId = 'html2'

	var filteredId = path.parse(pageId).base;			// '../password.txt' ==> 'password.txt'
	fs.readFile(`./data/${filteredId}`, 'utf-8', (err, description) => {

		// http://localhost:3000/page/CSS1 으로 접속했는데 ./data/CSS1 파일이 없다면 ==> err에 에러 들어옴
		if(err) {
			next(err);		// err 처리용 미들웨어(맨끝)로 직행
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
				<a href="/create">CREATE</a> 
				<a href="/update/${sanitizedTitle}">UPDATE</a> 
				<form action="/delete_process" method="post" onsubmit="alert('${sanitizedTitle}항목을 삭제하시겠습니까?');">
					<input type="hidden" name="id" value="${sanitizedTitle}">
					<input type="submit" value="delete">
				</form>
				`
			);															// delete를 GET방식으로 링크를 드러내서는 안 되므로 POST방식으로 하기 위해 form 사용
			res.send(html);
		}
	});
});


// 글쓰기(create)
app.get('/create', (req, res) => {
	var title = 'WEB - create';

	var list = template.list(req.list);
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


// 글쓰기 처리(create_process)
// 경로를 글쓰기와 똑같이 '/create'로 해도 된다 ==> 이 경우 request가 GET이면 '글쓰기'가 걸릴 것이고, POST이면 '글쓰기 처리'가 걸려서 처리된다.
app.post('/create_process', (req, res) => {
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
	// console.log(updateId);

	var filteredId = path.parse(updateId).base;
	fs.readFile(`./data/${filteredId}`, 'utf-8', function(err, description) {
		var title = filteredId;
		
		var list = template.list(req.list);
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


// 수정 처리하기(/update_process)
app.post('/update_process', (req, res) => {
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
	// 미들웨어 사용 후
	var post = req.body;
	var id = post.id;
	var filteredId = path.parse(id).base;
	fs.unlink(`./data/${filteredId}`, function(err){
		res.redirect(302, `/`);
	});

});



// 모든 경로에서 처리가 끝난 후에도 걸린 게 없는 경우 ==> ERROR 페이지 로드 404
// app.use( 미들웨어1, 미들웨어2) ==> 미들웨어1에서 next()를 사용하면 미들웨어2가 호출된다
// (주의!!) 미들웨어1에서 req.send(또는 json, end)을 호출해버리면 미들웨어2에서 다시는 호출할 수 없다(에러 발생)
var info404;
app.use( (req, res, next) => {
	info404 = `[req.ip] ${req.ip}<br> [req.url] ${req.url}<br> [req.path] ${req.path}<br>`;		// url은 쿼리까지 모두 포함, path는 경로까지만(물음표 직전까지)
	next();
}, (req, res, next) => {		// 콤마로 연결하여 다른 미들웨어를 더 붙일 수도 있다. 
	res.status(404).send(info404 + '<h2>404<br>Page Not Found</h2>');
	console.log('404 실행되었음');
});


// 에러 핸들링 미들웨어: 인자 4개임. 순서에 주의!!
// 다른 미들웨어에서 next(err)을 호출했을 때 여기에서 처리함
app.use( (err, req, res, next) => {
	console.error(err.stack);
	res.status(400).send('<h2>400<br>Bad Request</h2>');		// Error: ENOENT: no such file or directory, open './data/CSS1'
});



// 서버 시작
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});




