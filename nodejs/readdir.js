const testFolder = 'data';							// '.' 또는 './' ==> 어떻게 적어도 뒤에 /를 붙여준다. 현재 디렉토리 내 data 폴더에 있는 파일을 원하면 'data'라고 적으면 된다.
const fs = require('fs');

fs.readdir(testFolder, (err, fileList) => {
	fileList.forEach(
		(file) => {
			console.log(file);
		}
	);
});

