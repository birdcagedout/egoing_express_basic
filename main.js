// 생활코딩(egoing)님의 WEB3 Express 강의
// 
// 블로그: https://opentutorials.org/module/3590
// 유튜브: https://www.youtube.com/playlist?list=PLuHgQVnccGMAGOQu8CBDO9hn-FXFmm4Wp
//
// Semantic URL: URL에 ?가 들어간 쿼리 스트링을 사용하기보다 가독성이 좋은 계층적 Path로 URL를 구성하는 방법
// ex. http://localhost:3000/topic?id=0 ==> http://localhost:3000/topic/0
//
// 4단계. 라우팅까지 완료

const fs = require('fs');
const helmet = require('helmet');


const express = require('express');
const app = express();
const port = 3000;


// 보안 기본 설정
app.use(helmet());


// 미들웨어(body-Parser) 사용 1. body-parser
// app.use(미들웨어 부분), 사용자의 요청이 들어올 때마다 미들웨어 작동함
const bodyParser = require('body-parser');

// (클라이언트의) 폼 데이터 POST 요청에 대해서 사용
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


// 라우터 설정1
// '/topic'이라는 경로에 topicRouter라는 미들웨어를 적용함
var topicRouter = require('./routes/topic.js');
app.use('/topic', topicRouter);

// 라우터 설정2
// '/'이라는 경로에 indexRouter라는 미들웨어를 적용함
var indexRouter = require('./routes/index');
app.use('/', indexRouter);




// 위의 모든 경로에서 처리가 끝난 후에도 걸린 게 없는 경우 ==> ERROR 페이지 로드 404
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



// Default Error Handler: 인자 4개임. 순서에 주의!!
// 다른 미들웨어에서 next(err)을 호출했을 때 여기에서 처리함
app.use( (err, req, res, next) => {
	console.error(err.stack);
	res.status(400).send('<h2>400<br>Bad Request</h2>');		// Error: ENOENT: no such file or directory, open './data/CSS1'
});



// 서버 시작
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
