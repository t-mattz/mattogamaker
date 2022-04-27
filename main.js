'use strict';
$(document).ready(function(){
	const wait = (msec) => {
		return new Promise((resolve, reject) => {
			setTimeout(resolve, msec);
		});
	};
	async function next(v){
		await wait(v.pace);
		nextBatter(v);
	};
	/*
	 * 試合クラス 
	 */
	class Match {
		/*
		 * 初期化処理
		 */
		constructor() {
			this.reset();
		}
		reset = () => {
			let param = {
				pn : $('#pn').val() || '十亀',
				hn : $('#hn').val() || '松田',
				ab : $('#ab').val() !== '' ? Number($('#ab').val()) : 73,
				hr : $('#hr').val() !== '' ? Number($('#hr').val()) : 15,
				b3 : $('#b3').val() !== '' ? Number($('#b3').val()) : 0,
				b2 : $('#b2').val() !== '' ? Number($('#b2').val()) : 4,
				b1 : $('#b1').val() !== '' ? Number($('#b1').val()) : 15,
				db : $('#db').val() !== '' ? Number($('#db').val()) : 0,
				bb : $('#bb').val() !== '' ? Number($('#bb').val()) : 14,
				so : $('#so').val() !== '' ? Number($('#so').val()) : 9,
			};
			let hash = [];
			Object.keys(param).forEach(function (key) {
				hash.push(key + ':' + encodeURI(param[key]));
			});
			location.hash = hash.join('&');
			// 各種変数の初期化
			this.pn = this.pn || param.pn;
			this.hn = this.hn || param.hn;
			$('#score-board-hitter-name').text(this.hn);
			$('h1').text(this.hn + ' vs ' + this.pn + 'シミュレーター');
			let sum = 0;
			sum += param.hr;
			this.hrRate = sum / param.ab;
			sum += param.b3;
			this.sbRate = sum / param.ab;
			sum += param.b2;
			this.tbRate = sum / param.ab;
			sum += param.b1;
			this.shRate = sum / param.ab;
			sum += param.db;
			this.dbRate = sum / param.ab;
			sum += param.bb;
			this.bbRate = sum / param.ab;
			sum += param.so;
			this.soRate = sum / param.ab;
			this.inning = 1;
			this.outs = 0;
			this.aRunsByInning = [null,0,0,0,0,0,0,0,0,0];
			this.runsTotal = 0;
			this.runners = [0,0,0];
			this.batter = 1;
			this.randTable = [
				this.hrRate,
				this.sbRate,
				this.tbRate,
				this.shRate,
				this.dbRate,
				this.bbRate,
				this.soRate,
				1,
			];
			this.resultTable = [
				"ホームラン", // 0
				"スリーベース", // 1
				"ツーベース", // 2
				"ヒット", // 3
				"死球",   // 4
				"四球",   // 5
				"三振",   // 6
				"凡退",   // 7
			];
			this.results = [
				null,
				[0,0,0,0,0],
				[0,0,0,0,0],
				[0,0,0,0,0],
				[0,0,0,0,0],
				[0,0,0,0,0],
				[0,0,0,0,0],
				[0,0,0,0,0],
				[0,0,0,0,0],
				[0,0,0,0,0]
			];
			this.inningHasRunner = 0;
			this.message;
			this.allReset();
		}
		/*
		 * イニングごとの得点を取得
		 * 
		 * 引数を渡した時は加算して返す
		 */
		runsByInning = (runs = 0) => {
			this.aRunsByInning[this.inning] += runs;
			return this.aRunsByInning[this.inning];
		}
		/*
		 * 描画の初期化処理
		 */
		allReset() {
			for (let i = 1; i < 10; i++) {
				$('#inning-' + i).find('ol').empty();
				$('#inning-' + i).hide();
				$('#score-' + i).empty();
			}
			$('#score-total').empty();
			$('#summary td').empty();
		}

		/*
		 * メッセージキューの初期化
		 */
		resetMessage() {
			this.message = new Array();
		}

		/*
		 * メッセージキューに追加する
		 */
		setMessage(str) {
			this.message.push(str);
		}

		/*
		 * メッセージ内容の取得
		 */
		getMessage() {
			return this.message.join(' ');
		}

		/*
		 * 現在のアウトカウントをメッセージ用に変換して取得
		 */
		getOutCount() {
			switch(this.outs) {
				case 0:
					return '無死';
				case 1:
					return '一死';
				case 2:
					return '二死';
			}
		}

		/*
		 * 現在の走者状況をメッセージ用に変換して取得
		 */
		getRunners () {
			if (this.runners[0] && this.runners[1] && this.runners[2]) {
				return '満塁';
			} else if (this.runners[0] || this.runners[1] || this.runners[2]) {
				let r = new Array();
				if (this.runners[0]) r.push('一');
				if (this.runners[1]) r.push('二');
				if (this.runners[2]) r.push('三');
				return r.join('、') + '塁';
			} else {
				return '走者なし';
			}
		}

		/*
		 * 打席結果の後処理
		 */
		afterResult(result) {
			if (result.index > 5) {
				this.outs++;
			}
			if (this.outs >= 3) {
				if (0 == this.inningHasRunner) {
					this.setMessage('<span class="one-two-three">三者凡退</span>');
				}
				this.setMessage((this.inning == 9) ? '試合終了' : 'チェンジ');
			}
			if (9 == this.batter) {
				this.batter = 1;
			} else {
				this.batter++;
			}
			this.displayMessage();
			if (this.outs >= 3) {
				this.runners[0] = this.runners[1] = this.runners[2] = 0;
				this.outs = 0;
				this.inning++;
				this.inningHasRunner = 0;
			}
		}
		/*
		 * 打席結果を描画
		 */
		displayMessage(){
			let lid = '#inning-' + this.inning;
			$(lid).find('ol').append($('<li>').html(this.getMessage()));
			$(lid).show();
			$(window).scrollTop($('#target').offset().top);
		}

		/*
		 * 試合終了判定
		 */
		isGameSet () {
			return (this.inning > 9);
		}

		/*
		 * 打席結果の算出
		 */
		pickResult() {
			this.resetMessage('');
			this.setMessage('[' + this.batter + '番 ' + rep(this.hn) +']');
			this.setMessage(this.getOutCount());
			this.setMessage(this.getRunners());
			let rand = Math.random();
			let idx;
			let result;
			for (let i = 0; i < this.randTable.length; i++) {
				if (this.randTable[i] >= rand) {
					idx = i;
					break;
				}
			}
			result = {'index': idx, 'result' : this.resultTable[idx]};
			// 打順ごとの打数等を加算
			switch (idx) {
				case 0:
					this.results[this.batter][0]++;
					this.results[this.batter][1]++;
					this.results[this.batter][2]++;
					this.inningHasRunner = 1;
					break;
				case 1:
				case 2:
				case 3:
					this.results[this.batter][0]++;
					this.results[this.batter][1]++;
					this.inningHasRunner = 1;
					break;
				case 4:
				case 5:
					this.inningHasRunner = 1;
					break;
				case 6:
					this.results[this.batter][3]++;
				case 7:
					this.results[this.batter][0]++;
					break;
			}
			return result;
		}

		/*
		 * 打席結果の計算処理
		 */
		calcResult(res) {
			let modifier = '';
			let isPreemptive = !this.runsTotal;
			let runsBeforeAtBat = this.runsByInning();
			let runsAtBat = 0;
			switch(res.index) {
				case 0: // ホームラン
					runsAtBat = this.runners[0] + this.runners[1] + this.runners[2] + 1;
					this.runners[0] = this.runners[1] = this.runners[2] = 0;
					this.runsByInning(runsAtBat);
					this.runsTotal += runsAtBat;
					switch(runsAtBat) {
						case 1:
							modifier = 'ソロ';
							break;
						case 2:
						case 3:
							modifier = runsAtBat + 'ラン';
							break;
						case 4:
							modifier = '満塁';
						default:
							break;
					}
					break;
				case 1: // 3B
					runsAtBat = this.runners[0] + this.runners[1] + this.runners[2];
					this.runners[0] = this.runners[1] = 0;
					this.runners[2] = 1;
					this.runsByInning(runsAtBat);
					this.runsTotal += runsAtBat;
					switch(runsAtBat) {
						case 1:
							modifier = 'タイムリー';
							break;
						case 2:
						case 3:
							modifier = '走者一掃';
						default:
							break;
					}
					break;
				case 2: // 2B
					runsAtBat = this.runners[1] + this.runners[2];
					let runnerCount = this.runners[0] + this.runners[1] + this.runners[2];
					if (2 == this.outs && this.runners[0]) {
						this.runners[2] = 0;
						runsAtBat++;
					} else if (this.runners[0]){
						this.runners[2] = 1;
					}
					this.runners[0] = 0;
					this.runners[1] = 1;
					this.runsByInning(runsAtBat);
					this.runsTotal += runsAtBat;
					if (runsAtBat) {
						modifier = 'タイムリー';
					}
					if (runsAtBat > 1 && runsAtBat == runnerCount) {
						modifier = '走者一掃' + modifier;
					}
					break;
				case 3: // 1B
					if (this.runners[2]) {
						this.runners[2] = 0;
						runsAtBat++;
					}
					if (this.runners[1]) {
						this.runners[2] = 1;
						this.runners[1] = 0;
						if (2 == this.outs) {
							this.runners[2] = 0;
							runsAtBat++;
						}
					}
					if (this.runners[0]) {
						this.runners[1] = 1;
					}
					this.runners[0] = 1;
					this.runsByInning(runsAtBat);
					this.runsTotal += runsAtBat;
					if (runsAtBat > 0) {
						modifier = 'タイムリー';
					}
					break;
				case 4: // B
				case 5: // DB
					if (this.runners[0] && this.runners[1] && this.runners[2]) {
						modifier = '押し出し';
						runsAtBat = 1;
						this.runsByInning(runsAtBat);
						this.runsTotal += runsAtBat;
					} else if (! this.runners[0]){
						this.runners[0] = 1;
					} else if (2 == (this.runners[0] + this.runners[1] + this.runners[2])) {
						this.runners[0] = this.runners[1] = this.runners[2] = 1;
					} else {
						this.runners[1] = 1;
					}
					break;
				case 6:
				case 7:
					if (this.outs == 2 && (this.runners[1] + this.runners[2])) {
						modifier = '決定機を逃す';
					}
				default:
					break;
			}
			if (isPreemptive && runsAtBat) {
				modifier = '先制' + modifier;
			}
			this.setMessage('<span class="result-' + res.index + '">' + modifier + res.result + '</span>');
			if (runsAtBat) {
				this.setMessage(runsAtBat + '点追加！');
				this.results[this.batter][4] += runsAtBat;
			}
			if (runsAtBat && runsBeforeAtBat) {
				if (this.runsByInning() >= 10) {
					this.setMessage('この回<strong>' + this.runsByInning() + '</strong>点目！');
				} else {
					this.setMessage('この回' + this.runsByInning() + '点目！');
				}
			}
		}

		/*
		 * スコアボード（イニング）の描画
		 */
		setScoreBoard() {
			$('#score-'+ (this.inning)).text(this.runsByInning());
			$('#score-total').text(this.runsTotal);
		}

		/*
		 * スコアボード（集計）の描画
		 */
		drawSummary () {
			$('#summary').show();
			let d = 0, h = 0, r = 0, k = 0;
			for(let i = 1; i <= 9; i++) {
				d += this.results[i][0];
				h += this.results[i][1];
				r += this.results[i][2];
				k += this.results[i][3];
				for (let j = 0; j < 5; j++) {
					this.results[i][j] = ((this.results[i][j] < 10) ? "&nbsp;" : "") + this.results[i][j];
				}
				$('#summary').find('td').append(
					$('<p>').html(
						(i) + '番' + rep(this.hn) + '：'
							+ this.results[i][0] + '打数&thinsp;' + this.results[i][1]+'安打&thinsp;'
							+ this.results[i][2] + '本塁打&thinsp;' + this.results[i][3] + '三振&thinsp;'
							+ this.results[i][4] + '打点'
					)
				);
			}
			$('#summary').find('td').append($('<hr>'));
			$('#summary').find('td').append(
				$('<p>').html('全' + rep(this.hn) + ' : ' + d + '打数 ' + h + '安打 ' + r + '本塁打 ' + k + '三振')
			);
			$('#summary').find('td').append($('<p>').text('打率 : '+ ((h / d).toString().substring(1) + '00').substring(0, 4)));
			$('body').css('padding-top', '290px');
		}

		/*
		 * 描画スピードの設定
		 */
		setPace(val) {
			this.pace = val;
		}
	}

	/* =====================================================================
	 * functions
	 ===================================================================== */

	/*
	 * 次打者の呼び出し
	 */
	function nextBatter(v) {
		let result = v.pickResult();
		v.calcResult(result);
		v.setScoreBoard();
		v.afterResult(result);
		if (v.isGameSet()) {
			$('#restart').show();
			$(window).scrollTop($('#target').offset().top);
			v.drawSummary();
		} else {
			next(v);
		}
	}

	/*
	 * main
	 */
	let v;

	/*
	 * 始めるボタン押下時の処理
	 */
	$('#start, #start_').on('click', function() {

		v = new Match();
		v.setPace($('#pace').val());
		$('#start, #past, #input, #description').hide();
		nextBatter(v);
	});

	/*
	 * もう一回ボタン押下時の処理
	 */
	$('#restart').on('click', function(){
		v.reset();
		v.setPace($('#pace').val());
		$(this).hide();
		nextBatter(v);
	});

	/*
	 * スコアボードをクリックしたら畳む
	 */
	$('#summary').on('click', function() {
		$(this).find('p, hr').toggle();
		$(this).height('10px');
		$(this).find('td').css({'height':'10px','overflow':'hidden'});
	});

	/*
	 * ペース変更時の処理
	 */
	$('#pace').on('change', function() {
		v.setPace($('#pace').val());
	});

	/*
	 * イニングの数字をクリックしたらその回の結果にスクロール
	 */
	$('#score-1,#score-2,#score-3,#score-4,#score-4,#score-5,#score-6,#score-7,#score-8,#score-9').on('click', function() {
		let target = $('#'+ $(this).attr('id').replace(/score/, 'inning'));
		if (!target.length) return;
		$('html').animate({scrollTop: target.offset().top - $('#summary').height() - 100}, 500, 'swing');
	});

	$('#ab, #hr, #b3, #b2, #v1, #db, #bb, #so').on(
		'change blur keypress', () => {isPressable();}
	);
	const isPressable = () => {
		let title = $('#pn').val() + ' vs ' + $('#hn').val() + ' シミュレーター';
		$('title').html(title);
		$('h1').html(title);
		if ($('#ab').val() === '' && $('#hr').val() === '' &&
	    	$('#b3').val() === '' && $('#b2').val() === '' &&
			$('#b1').val() === '' && $('#db').val() === '' &&
			$('#bb').val() === '' && $('#so').val() === '') {
			$('#start').prop('disabled', false);
			$('#warn').empty();
			return;
		}

		if ($('#ab').val() !== '' && $('#hr').val() !== '' &&
			$('#b3').val() !== '' && $('#b2').val() !== '' &&
			$('#b1').val() !== '' && $('#db').val() !== '' &&
			$('#bb').val() !== '' && $('#so').val() !== '') {
				if (Number($('#ab').val()) <= (Number($('#hr').val()) + Number($('#b3').val()) + Number($('#b2').val()) + Number($('#b1').val()) + Number($('#db').val()) + Number($('#bb').val()))) {
				$('#start').prop('disabled', true);
				$('#warn').empty();
				$('#warn').text("打数を増やさないとイニングが終わらないよ");
				return;
			} else {
				$('#start').prop('disabled', false);
				$('#warn').empty();
				return;
			}
		}
		$('#start').prop('disabled', true);
		$('#warn').empty();
		$('#warn').text("投手名、打者名以外は全項目を埋めてください");
		return;
	}
	if (location.hash) {
		let hs = location.hash.substring(1);
		hs.split(/&/).forEach((e) => {
			let kv = e.split(/:/);
			if (Number(kv[1]) < 0) {
				kv[1] = 0;
			}
			$('#' + kv[0]).val(decodeURI(kv[1]));
		});
		isPressable();
	}
	const rep = (str) => {
		return str.replace(/&/g, '&lt;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, "&#x27;");
	}
});
