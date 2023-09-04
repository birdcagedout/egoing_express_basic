var M = {
	v: 'v',
	f: function() {
		console.log(this.v);
	}
};


var Hidden = {
	v: 'hid',
	f: function() {
		console.log(this.v);
	}
};




module.exports = M;		// 이 파일 외부에서 export 하면 M을 사용할 수 있다