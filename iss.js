/*
IMPLAY 에 사용되는 *.ISS 파일에 관련 자료
*/
function ISS(buffer){
    var getByte = new GetByte(buffer);
    GetByte.symbol  = '❔';  // symbol 오류시 변환 문자
    GetByte.hanja   = '🀄';  // 中 한자 오류시 변환 문자

    /************************************************************************/
    // 해더 정보
    function SongHeader(){
        return {
            head_str   : getByte(20         )   // 25 char
           ,reserved   : getByte(10         )   // 25 char
           ,writer     : getByte(30         )   // 25 char
           ,composer   : getByte(30         )   // 25 char
           ,singer     : getByte(30         )   // 25 char
           ,editor     : getByte(30         )   // 25 char
           ,rec_count  : getByte( 2, 'int16')   // int
           ,line_count : getByte( 2, 'int16')   // int
        };
    }

    // 가사 출력관련 개체
    function SongRecord(){
        return {
            kasa_tick : getByte(2, 'int16') // int
           ,line      : getByte(1, 'int8') //char
           ,start_x   : getByte(1, 'int8') //char
           ,width_x   : getByte(1, 'int8') //char
        }
    }

    // 가사 정보
    function SongScript(){
        return { script : getByte(64) }; // 한줄당 64 바이트
    }
    /************************************************************************/

    // iss 해더정보
    var songHeader = new SongHeader();
    //console.log('SongHeader',songHeader);

    // 가사출력 정보
    songRecord = [];
    for(var i=0; i<songHeader.rec_count; i++) songRecord.push(new SongRecord());

    // 가사데이타 읽기
    lyrics = [];
    for(var i=0; i<songHeader.line_count; i++){
        var line = new SongScript();
        lyrics.push( line.script );   // 64 char
        if(GetByte.isErr) console.log(i,line)
    }

    // 가사 출력정보 순으로 정렬된 가사(전체가사 보기용)
    var brforeLine = songRecord[0].line;
    var lyric = [ lyrics[brforeLine] ];
    for(var i=1; i<songHeader.rec_count; i++){
        if(brforeLine != songRecord[i].line){
            brforeLine = songRecord[i].line;
            lyric.push( lyrics[brforeLine] );
        }
    }

    // 가사 다운로드
    function lyricDownload(filename){
        var text = iss.lyric.join('\n');
        download(filename, text);
    }

    var viewLyricElement
    // 가사보기 개체
    function ViewLyric(id){
        viewLyricElement=document.querySelector(id);
        //alert(viewLyricElement)
        var shIndex = 0;
        var lyricTimer=null;
        //function mkTime(){return (songRecord[shIndex].kasa_tick-tick)*(140/69+10);}
        function mkTime(){return (songRecord[shIndex].kasa_tick-tick)*5;}
        function viewLyricNext(){
            var start = songRecord.findIndex( item=>{return item.line==songRecord[shIndex].line} )
            var lyc = lyrics[ songRecord[shIndex].line ].putLyrics(songRecord.slice(start,shIndex+1))

            if(lyrics!=(songRecord[shIndex].line+1)) lyc += '<Br>' + lyrics[ songRecord[shIndex].line+1 ];
            viewLyricElement.innerHTML = '<pre aria-label="ASCII COW">'+lyc+'</pre>';
            document.querySelectorAll('#btnDiv > button')[1].innerHTML = JSON.stringify( songRecord[shIndex] );
            tick = songRecord[shIndex].kasa_tick;
            shIndex++;
            if(shIndex < songRecord.length){
                lyricTimer = setTimeout(viewLyricNext, mkTime());
            }else{
                clearTimeout(lyricTimer);
                lyricTimer=null;
                document.querySelectorAll('#btnDiv > button')[1].innerHTML = 'End';
                shIndex=0;
            }
        }
        function viewLyric(){
            //console.log(shIndex);
            if(!shIndex){
                var l = lyrics[ songRecord[shIndex].line ]
                if(lyrics!=(songRecord[shIndex].line+1)) l += '\n' + lyrics[ songRecord[shIndex].line+1 ];
                viewLyricElement.innerHTML = '<pre aria-label="ASCII COW">'+l+'</pre>';
            }
            if(lyricTimer){
                //console.log('일시정지');
                clearTimeout(lyricTimer);
                lyricTimer=null;
                //document.querySelectorAll('#btnDiv > button')[1].innerHTML = 'ViewLyric';
            }else{
                //console.log('재생');
                tick = songRecord[shIndex].kasa_tick;
                lyricTimer = setTimeout(viewLyricNext, mkTime());
            }
        }
        return {play:viewLyric}
    }


    var beforeTick=-1;
    // 틱정보로 가사 출력
    function playLyric(tick){
        if( !(tick||false) ) return; // error
        if(beforeTick==tick) return; // 
        beforeTick = tick;
        //console.log('tick', tick);
        //console.log('songRecord', songRecord);
        // 틱값의 보다 같거나 작은 배열 검색
        var filter = songRecord.filter(item=>item.kasa_tick<=tick)||false;
        var idx = filter.length;
        //console.log('filter', filter.length, filter);
        if(filter.length==0){ //없으면 종료
            // 다음가사
            var lyc = lyrics[ 0 ] + '<Br>' + lyrics[ 1 ];
            // 가사 출력
            viewLyricElement.innerHTML = '<pre aria-label="ASCII COW">'+lyc+'</pre>';
            return null;
        }

        // 틱값의 보다 같거나 작은 배열 검색 (없으면 첫번째 배열)
        //var filter = iss.record.filter(item=>item.kasa_tick<=tick)||iss.record[0];
        // 출력할 가사줄
        var curRec = filter.pop();
        //console.log('curRec',curRec)
        // 출혁할 가사줄과 같은라인이 시작하는 배열 인덱스
        //var start = songRecord.findIndex( item=>{return item.line==curRec.line} )
        //for(var i=0; i<100
        var start=idx-1;
        for(var i=start-1; i>0; i--) {
            if(songRecord[i].line != curRec.line) {
                break;
            }
            start = i;
        }
        // 가사에 하이라이트 표시
        //console.log(`songRecord.slice(${start},${idx})`)
        //console.log(songRecord.slice(start,idx))
        var lyc = lyrics[ curRec.line ].putLyrics( songRecord.slice(start,idx) )
        // 다음가사
        if(lyrics.length!=(curRec.line+1)) lyc += '<Br>' + lyrics[ curRec.line+1 ];
        // 가사 출력
        viewLyricElement.innerHTML = '<pre aria-label="ASCII COW">'+lyc+'</pre>';

        if(idx == iss.record.length) return 'END';
        else                         return curRec;
    }


    return {header:songHeader, record:songRecord, line:lyrics, lyric:lyric
           ,download:lyricDownload
           ,viewLyric:ViewLyric
           ,play:playLyric};
}



/*
가사 한줄 출력 (하이라이트 표시)
pos : 출력할 가사의 같은줄 배열
string : 하이라이트 표시할 가사 1줄

예시)
긴 밤 지새우고 풀잎마다 맺힌        16, 40

긴 밤 지새우고 풀잎마다 맺힌
 |
{kasa_tick: 264, line: 0, start_x: 0, width_x: 2}  pos[0]
긴 밤 지새우고 풀잎마다 맺힌
  | |
{kasa_tick: 288, line: 0, start_x: 3, width_x: 2}  pos[1]
긴 밤 지새우고 풀잎마다 맺힌
     | |
{kasa_tick: 324, line: 0, start_x: 6, width_x: 2}  pos[2]
긴 밤 지새우고 풀잎마다 맺힌
       | |
{kasa_tick: 336, line: 0, start_x: 8, width_x: 2}  pos[3]
긴 밤 지새우고 풀잎마다 맺힌
         | |
{kasa_tick: 360, line: 0, start_x: 10, width_x: 2} pos[4]
긴 밤 지새우고 풀잎마다 맺힌
           | |
{kasa_tick: 384, line: 0, start_x: 12, width_x: 2}
긴 밤 지새우고 풀잎마다 맺힌
              |
{kasa_tick: 456, line: 0, start_x: 15, width_x: 2}
긴 밤 지새우고 풀잎마다 맺힌
                |
{kasa_tick: 480, line: 0, start_x: 17, width_x: 2}
긴 밤 지새우고 풀잎마다 맺힌
                  |
{kasa_tick: 516, line: 0, start_x: 19, width_x: 2}
긴 밤 지새우고 풀잎마다 맺힌
                    |
{kasa_tick: 528, line: 0, start_x: 21, width_x: 2}
긴 밤 지새우고 풀잎마다 맺힌
                       |
{kasa_tick: 552, line: 0, start_x: 24, width_x: 2}
긴 밤 지새우고 풀잎마다 맺힌
                         |
{kasa_tick: 576, line: 0, start_x: 26, width_x: 2}

               ＫＩＳ ＭＵＳＩＣ ＬＯＶＥ ＣＬＵＢ     $
             |                          |             |
{kasa_tick: 546, line: 0, start_x: 14, width_x: 41}
*/
String.prototype.putLyrics = function(pos){
    var tmp = '';    // 반환할 문자열
    var start_i;     // 자를 시작위치(하이라이트 시작위치)
    var width_i=0;   // 자를 너비(하이라이트 표시할 너비{글자수})
    var posIdx = 0;  // 출력 pos 위치

    for(b=i=0;c=this.charCodeAt(i);) { // 문자 단위 진행 (b는 byte i는 문자)
        var isNotAscii = c>>7;         // 127 보다 크면 한글
        b+=isNotAscii?2:1;             // 한글이면 2byte count
//console.log(b,i,`[${this.charAt(i)}]`);
        if(b==pos[posIdx].start_x) {   // 하이라이트 시작위치 인경우
            if(!posIdx) tmp  = this.slice(0,i+1);         // 처음    부터 현재위치까지
            else        tmp += this.slice(start_i,i+1);  // 이전위치부터 현재위치까지
            start_i = i+1; // 다음문자

            if(posIdx){
                // 이전줄보다 시작지점이 작으면(역방향)
                if(pos[posIdx].start_x < pos[posIdx-1].start_x){
                    start_i = i; // 현재위치
                    tmp = this.slice(0, i);
                }
            }
        }
        if(b==(pos[posIdx].start_x+pos[posIdx].width_x)){ // 하이라이트 마지막인경우
            //console.log(start_i, i+1)
            tmp+= '<span>'+this.slice(start_i,i+1)+'</span>' // <span> ~ </span> 부분을 하이라이트 처리함.
            width_i = pos[posIdx].width_x; // 사용않음
            start_i = i+1; // 다음 시작위치
            posIdx++;      // 다음 출력위치로 이동
            if(posIdx == pos.length){ // 가사 하이라이트 배열 끝인경우
                //log('끝', 'posIdx', posIdx, i+1, this.slice(i+1,this.length));
                tmp+=this.slice(i+1,this.length); // 하이라이트 종료이면 남은 문자 붙여줌
                break; // 종료
            }
            // 이전줄보다 시작지점이 작으면(역방향)
            if(pos[posIdx].start_x <= pos[posIdx-1].start_x){
                // 처음부터 다시 시작
                i=-1; // 아래에서 +1 하므로 -1 하였음.
                b=0;
            }
            /*
            if(pos[posIdx].start_x == pos[posIdx-1].start_x){
                start_i = i;
                b-=isNotAscii;
            }
            */
        }
        i++; // 다음추출
    }
    return tmp; // 하이라이트(span tag)처리된 문자열
}



// 진행 가사 표시 (사용않음)
String.prototype.sliceByByte = function(start,width){
    var tmp = '';
    var start_i;
    var width_i;
    for(b=i=0;c=this.charCodeAt(i);) {
        var isNotAscii = c>>7;
        b+=isNotAscii?2:1;
        //if (b > maxByte) break;
        if(b==start) {
            tmp = this.slice(0,i+1)+'<span>';
            start_i = i+1;
        }
        if(b==(start+width)){
            //log('start_i',start_i,'i',i,this.charAt(i));
            tmp+= this.slice(start_i,i+1)+'</span>'+this.slice(i+1,this.length);
            width_i = i;
            break;
        }
        i++;
    }
    return tmp;
}
