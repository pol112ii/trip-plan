/* ==========================================================
   샘플 여행 데이터 (포르투갈 8일)

   ※ 앱은 기본적으로 "빈 여행"으로 시작합니다.
      이 샘플은 설정 > 샘플 여행 둘러보기 를 눌렀을 때만 불러옵니다.
      구조를 참고할 때 보세요.
   ========================================================== */

const SAMPLE_TRIP = {
  title: "포르투갈 8일",
  subtitle: "리스본 · 신트라 · 포르투",
  travelers: ["이솔찬", "황지현"],
  currency: "EUR",
  // 일정 타입: 명소 / 식당 / 이동 / 숙소 / 쇼핑 / 휴식 / 기타
  days: [
    {
      date: "2027-07-31", city: "리스본",
      memo: "도착일. 시차 있으니 무리하지 말고 동네 산책 정도만.",
      items: [
        { time:"13:30", title:"인천 출발 (KE921)", type:"이동", move:"✈️ 대한항공 직항", place:"인천국제공항 제2터미널", lat:37.4602, lng:126.4407, note:"3시간 전 도착 권장 · 온라인 체크인 완료" },
        { time:"19:40", title:"리스본 공항 도착 (LIS)", type:"이동", move:"✈️ 현지시각", place:"Aeroporto Humberto Delgado", lat:38.7742, lng:-9.1342, note:"입국심사 후 짐 찾고 유심/eSIM 활성화" },
        { time:"20:45", title:"공항 → 숙소 이동", type:"이동", move:"🚕 볼트(Bolt) 약 20분", place:"Rossio Plaza", lat:38.7139, lng:-9.1394, note:"현금 말고 앱 결제. 대략 €12~16", warn:"공항 택시 호객 주의 · 반드시 앱으로" },
        { time:"21:30", title:"숙소 체크인 (로시오 플라자)", type:"숙소", move:"🚶 도보", place:"Rossio Plaza Hotel", lat:38.7139, lng:-9.1394, note:"바우처는 [서류] 탭에 있음" },
        { time:"22:15", title:"첫 저녁 · 근처 타스카", type:"식당", move:"🚶 도보 5분", place:"Rua das Portas de Santo Antão", lat:38.7157, lng:-9.1400, note:"늦게까지 하는 골목. 가볍게 바칼라우 + 비뉴 베르드" },
        { time:"23:00", title:"숙소 복귀 (로시오 플라자)", type:"숙소", move:"🚶 도보", place:"Rossio Plaza", lat:38.7139, lng:-9.1394 }
      ]
    },
    {
      date: "2027-08-01", city: "리스본",
      memo: "알파마 + 트램 28. 오르막 많으니 편한 신발 필수.",
      items: [
        { time:"09:00", title:"숙소 출발 (로시오 플라자)", type:"이동", move:"🚶 도보", place:"Rossio Plaza", lat:38.7139, lng:-9.1394 },
        { time:"09:30", title:"도둑시장 (Feira da Ladra)", type:"명소", move:"🚋 트램 28 (1회권·비바비아젬)", place:"Campo de Santa Clara", lat:38.7156, lng:-9.1256, warn:"화·토만 운영 · 빈티지/소품 벼룩시장" },
        { time:"12:30", title:"포르타스 두 솔 전망대", type:"명소", move:"🚶 도보", place:"Miradouro das Portas do Sol", lat:38.7118, lng:-9.1303, note:"알파마 골목 내려다보기 · 사진 명당" },
        { time:"13:30", title:"알파마 점심", type:"식당", move:"🚶 도보", place:"Alfama", lat:38.7118, lng:-9.1290, note:"정어리 구이(사르디냐) 시즌" },
        { time:"15:00", title:"트램 28 체험", type:"이동", move:"🚋 트램 28 (1회권·비바비아젬)", place:"Martim Moniz", lat:38.7160, lng:-9.1360, note:"명물 노란 트램", warn:"소매치기 최다 구간 · 가방 앞으로" },
        { time:"16:45", title:"Manteigaria (에그타르트)", type:"식당", move:"🚶 도보", place:"Manteigaria Chiado", lat:38.7107, lng:-9.1420, note:"갓 나온 거 + 시나몬 듬뿍" },
        { time:"17:30", title:"산타 주스타 엘리베이터", type:"명소", move:"🚶 도보", place:"Elevador de Santa Justa", lat:38.7121, lng:-9.1394, warn:"줄 길면 카르무 수도원 쪽 무료 통로 이용" },
        { time:"19:30", title:"Marisqueira Uma (해산물)", type:"식당", move:"🚶 도보", place:"Rua dos Sapateiros 177", lat:38.7105, lng:-9.1385, note:"예약 권장 · 아로즈 드 마리스쿠" },
        { time:"22:00", title:"숙소 복귀 (로시오 플라자)", type:"숙소", move:"🚶 도보 8분", place:"Rossio Plaza", lat:38.7139, lng:-9.1394 }
      ]
    },
    {
      date: "2027-08-02", city: "신트라",
      memo: "당일치기 신트라. 페나성 티켓은 시간지정제 — 늦으면 입장 불가.",
      items: [
        { time:"08:10", title:"로시우역 → 신트라 기차", type:"이동", move:"🚆 CP 약 40분", place:"Estação do Rossio", lat:38.7143, lng:-9.1416, note:"비바비아젬 충전으로 탑승" },
        { time:"09:20", title:"페나 성", type:"명소", move:"🚌 434 버스", place:"Palácio Nacional da Pena", lat:38.7876, lng:-9.3904, warn:"입장 시간 09:30 지정 · 티켓 [서류] 탭" },
        { time:"12:00", title:"헤갈레이라 별장", type:"명소", move:"🚶 도보 + 🚌", place:"Quinta da Regaleira", lat:38.7963, lng:-9.3963, note:"우물(Poço Iniciático) 나선계단 필수" },
        { time:"14:00", title:"신트라 시내 점심", type:"식당", move:"🚶 도보", place:"Sintra Vila", lat:38.7979, lng:-9.3906, note:"트라베세이루 + 케이자다 디저트" },
        { time:"16:00", title:"카보 다 로카 (유라시아 서쪽 끝)", type:"명소", move:"🚌 403 버스", place:"Cabo da Roca", lat:38.7803, lng:-9.4989, warn:"바람 매우 강함 · 겉옷 챙기기" },
        { time:"18:00", title:"카스카이스 해변 산책", type:"휴식", move:"🚌 403 버스", place:"Cascais", lat:38.6968, lng:-9.4215, note:"노을 보고 해안선 기차로 복귀" },
        { time:"20:30", title:"카스카이스 → 리스본 (카이스 두 소드레)", type:"이동", move:"🚆 해안선 기차 40분", place:"Cais do Sodré", lat:38.7067, lng:-9.1450 },
        { time:"21:30", title:"숙소 복귀 (로시오 플라자)", type:"숙소", move:"🚇 지하철", place:"Rossio Plaza", lat:38.7139, lng:-9.1394 }
      ]
    },
    {
      date: "2027-08-03", city: "리스본",
      memo: "벨렝 + LX팩토리. 오후에 짐 정리(내일 포르투 이동).",
      items: [
        { time:"09:30", title:"제로니무스 수도원", type:"명소", move:"🚋 15E 트램", place:"Mosteiro dos Jerónimos", lat:38.6979, lng:-9.2064, warn:"오픈런 아니면 줄 30분+" },
        { time:"11:30", title:"파스테이스 드 벨렝", type:"식당", move:"🚶 도보 3분", place:"Pastéis de Belém", lat:38.6975, lng:-9.2032, note:"원조 에그타르트 · 매장 안쪽 착석이 빠름" },
        { time:"12:30", title:"벨렝 탑 & 발견 기념비", type:"명소", move:"🚶 도보", place:"Torre de Belém", lat:38.6916, lng:-9.2160 },
        { time:"14:30", title:"LX 팩토리", type:"쇼핑", move:"🚋 15E 트램", place:"LX Factory", lat:38.7017, lng:-9.1786, note:"레르 데바가르 서점 · 소품샵" },
        { time:"17:00", title:"타임아웃 마켓", type:"식당", move:"🚋 15E 트램", place:"Time Out Market", lat:38.7067, lng:-9.1459, note:"푸드홀 — 각자 먹고 싶은 거" },
        { time:"19:30", title:"세뇨라 두 몬트 전망대 (노을)", type:"명소", move:"🚕 볼트", place:"Miradouro da Senhora do Monte", lat:38.7167, lng:-9.1330, note:"리스본 최고 높이 뷰포인트" },
        { time:"21:30", title:"숙소 복귀 + 짐 싸기", type:"숙소", move:"🚕 볼트", place:"Rossio Plaza", lat:38.7139, lng:-9.1394, warn:"내일 오전 기차 · 캐리어 미리 정리" }
      ]
    },
    {
      date: "2027-08-04", city: "포르투",
      memo: "오전 기차로 포르투 이동. 저녁은 히베이라 야경.",
      items: [
        { time:"08:30", title:"숙소 체크아웃", type:"숙소", move:"🚶 도보", place:"Rossio Plaza", lat:38.7139, lng:-9.1394 },
        { time:"09:15", title:"산타 아폴로니아역 → 포르투", type:"이동", move:"🚆 AP125 알파 펜둘라르", place:"Santa Apolónia", lat:38.7139, lng:-9.1226, warn:"좌석 지정 · 기차표 [서류] 탭 · 20분 전 도착" },
        { time:"12:10", title:"포르투 캄파냐 도착", type:"이동", move:"🚆 도착 후 지하철 환승", place:"Porto Campanhã", lat:41.1487, lng:-8.5854, note:"메트로 타고 시내(트린다드/상 벤투)로" },
        { time:"12:40", title:"숙소 체크인 (비네트 컬렉션)", type:"숙소", move:"🚕 우버", place:"Vignette Collection Porto", lat:41.1465, lng:-8.6110, note:"바우처는 [서류] 탭" },
        { time:"13:30", title:"Majestic Café 점심", type:"식당", move:"🚶 도보", place:"Café Majestic", lat:41.1470, lng:-8.6069, note:"해리포터 작가 단골설 카페" },
        { time:"15:00", title:"상 벤투 역 아줄레주", type:"명소", move:"🚶 도보", place:"Estação de São Bento", lat:41.1456, lng:-8.6106, note:"파란 타일 벽화 2만장" },
        { time:"16:30", title:"클레리구스 탑", type:"명소", move:"🚶 도보", place:"Torre dos Clérigos", lat:41.1456, lng:-8.6144, warn:"계단 225개 · 체력 안배" },
        { time:"18:30", title:"히베이라 강변 + 동 루이스 다리", type:"명소", move:"🚶 도보", place:"Ponte Luís I", lat:41.1399, lng:-8.6094, note:"다리 위층 걸어서 건너기 — 야경 최고" },
        { time:"20:00", title:"가이아 쪽 저녁 (강 건너)", type:"식당", move:"🚶 도보", place:"Vila Nova de Gaia", lat:41.1379, lng:-8.6118 },
        { time:"22:30", title:"숙소 복귀", type:"숙소", move:"🚕 우버", place:"Vignette Collection Porto", lat:41.1465, lng:-8.6110 }
      ]
    },
    {
      date: "2027-08-05", city: "포르투",
      memo: "렐루 서점 09:15 입장권 있음 — 시간 엄수!",
      items: [
        { time:"09:15", title:"렐루 서점", type:"명소", move:"🚶 도보", place:"Livraria Lello", lat:41.1470, lng:-8.6148, warn:"09:15 시간지정 입장권 (2인) · 늦으면 무효" },
        { time:"10:30", title:"카르무 성당 아줄레주", type:"명소", move:"🚶 도보 3분", place:"Igreja do Carmo", lat:41.1475, lng:-8.6156 },
        { time:"11:30", title:"볼량 시장", type:"쇼핑", move:"🚶 도보", place:"Mercado do Bolhão", lat:41.1487, lng:-8.6060, note:"치즈·염장대구·통조림 기념품" },
        { time:"13:00", title:"프란세지냐 점심", type:"식당", move:"🚶 도보", place:"Café Santiago", lat:41.1471, lng:-8.6043, note:"포르투 명물 — 한 개 시켜서 나눠먹어도 충분" },
        { time:"15:00", title:"포트와인 셀러 투어 (샌드맨)", type:"명소", move:"🚶 도보 + 다리 건너기", place:"Sandeman Porto", lat:41.1379, lng:-8.6118, note:"테이스팅 3잔 포함" },
        { time:"17:30", title:"가이아 케이블카 + 전망", type:"명소", move:"🚡 텔레페리쿠", place:"Teleférico de Gaia", lat:41.1370, lng:-8.6090 },
        { time:"19:30", title:"도루강 선셋 크루즈", type:"명소", move:"⛵ 6다리 크루즈 50분", place:"Cais da Ribeira", lat:41.1409, lng:-8.6132, warn:"출발 15분 전 탑승 · 날씨 확인" },
        { time:"21:30", title:"히베이라 저녁", type:"식당", move:"🚶 도보", place:"Ribeira", lat:41.1409, lng:-8.6132 }
      ]
    },
    {
      date: "2027-08-06", city: "포르투",
      memo: "여유 있는 마지막 날. 바다 보고 기념품 마무리.",
      items: [
        { time:"10:00", title:"포즈 두 도루 해안 산책", type:"휴식", move:"🚋 1번 빈티지 트램", place:"Foz do Douro", lat:41.1500, lng:-8.6800, note:"강변 따라 달리는 트램 자체가 관광" },
        { time:"12:30", title:"마토지뉴스 해산물 점심", type:"식당", move:"🚇 메트로 A선", place:"Matosinhos", lat:41.1830, lng:-8.6990, note:"숯불 생선구이 골목" },
        { time:"15:00", title:"세랄베스 미술관 & 정원", type:"명소", move:"🚌 버스", place:"Museu de Serralves", lat:41.1594, lng:-8.6598, note:"정원만 걸어도 좋음" },
        { time:"18:00", title:"기념품 마무리 쇼핑", type:"쇼핑", move:"🚕 우버", place:"Rua de Santa Catarina", lat:41.1470, lng:-8.6060, warn:"내일 오전 기차 · 캐리어 무게 체크" },
        { time:"20:00", title:"마지막 저녁", type:"식당", move:"🚶 도보", place:"Porto Centro", lat:41.1465, lng:-8.6110 },
        { time:"22:00", title:"숙소 복귀 + 짐 싸기", type:"숙소", move:"🚶 도보", place:"Vignette Collection Porto", lat:41.1465, lng:-8.6110 }
      ]
    },
    {
      date: "2027-08-07", city: "귀국",
      memo: "포르투 → 리스본 기차 → 공항. 택스리펀 시간 넉넉히.",
      items: [
        { time:"08:00", title:"숙소 체크아웃", type:"숙소", move:"🚶 도보", place:"Vignette Collection Porto", lat:41.1465, lng:-8.6110 },
        { time:"09:00", title:"포르투 캄파냐 → 리스본", type:"이동", move:"🚆 알파 펜둘라르 (귀국편)", place:"Porto Campanhã", lat:41.1487, lng:-8.5854, warn:"기차표(귀국) [서류] 탭 · 8/7" },
        { time:"12:15", title:"리스본 오리엔트역 도착", type:"이동", move:"🚆 → 🚇 공항선", place:"Gare do Oriente", lat:38.7677, lng:-9.0995 },
        { time:"13:00", title:"공항 도착 · 택스리펀", type:"이동", move:"🚇 메트로 레드라인", place:"Lisbon Airport", lat:38.7742, lng:-9.1342, warn:"리펀 창구 줄 김 · 최소 3시간 전 도착" },
        { time:"16:05", title:"리스본 출발 (KE922)", type:"이동", move:"✈️ 대한항공 직항", place:"Lisbon Airport", lat:38.7742, lng:-9.1342 },
        { time:"11:35", title:"인천 도착 (+1일)", type:"이동", move:"✈️ 다음날 도착", place:"인천국제공항", lat:37.4602, lng:126.4407, note:"수고했어요 ✈️" }
      ]
    }
  ],

  // 도시별 맛집 리스트 — city 가 그날의 도시와 같으면 오버뷰에 자동으로 뜹니다.
  food: [
    { city:"리스본", name:"Manteigaria", kind:"디저트", note:"갓 구운 에그타르트. 시나몬 듬뿍", lat:38.7107, lng:-9.1420 },
    { city:"리스본", name:"Marisqueira Uma", kind:"맛집", note:"아로즈 드 마리스쿠(해산물밥). 예약 권장", lat:38.7105, lng:-9.1385 },
    { city:"리스본", name:"Time Out Market", kind:"시장", note:"푸드홀 — 각자 먹고 싶은 거 골라서", lat:38.7067, lng:-9.1459 },
    { city:"리스본", name:"Pastéis de Belém", kind:"디저트", note:"1837년 원조 에그타르트. 매장 안쪽이 빠름", lat:38.6975, lng:-9.2032 },
    { city:"리스본", name:"A Cevicheria", kind:"맛집", note:"세비체. 웨이팅 길지만 값어치", lat:38.7156, lng:-9.1533 },
    { city:"리스본", name:"Park Bar", kind:"바", note:"주차장 옥상 루프탑. 노을 시간에", lat:38.7107, lng:-9.1466 },
    { city:"신트라", name:"Piriquita", kind:"디저트", note:"트라베세이루 · 케이자다 원조집", lat:38.7975, lng:-9.3903 },
    { city:"신트라", name:"Tascantiga", kind:"맛집", note:"작은 타파스집. 테라스 자리 명당", lat:38.7969, lng:-9.3897 },
    { city:"포르투", name:"Café Santiago", kind:"맛집", note:"프란세지냐. 하나 시켜 나눠 먹어도 충분", lat:41.1471, lng:-8.6043 },
    { city:"포르투", name:"Café Majestic", kind:"카페", note:"1921년 벨에포크 카페. 아침이 한산", lat:41.1470, lng:-8.6069 },
    { city:"포르투", name:"Mercado do Bolhão", kind:"시장", note:"치즈 · 염장대구 · 통조림 기념품", lat:41.1487, lng:-8.6060 },
    { city:"포르투", name:"Sandeman", kind:"바", note:"포트와인 셀러 투어 + 테이스팅 3잔", lat:41.1379, lng:-8.6118 }
  ],

  // 예약 서류 — url 에 링크를 넣거나, 앱에서 파일을 첨부하면 오프라인에서도 열립니다.
  docs: [
    { type:"항공권", title:"항공권 · 이솔찬 (KE921/922)", sub:"7/31 인천 13:30 → 리스본 19:40", url:"" },
    { type:"항공권", title:"항공권 · 황지현 (KE921/922)", sub:"7/31 인천 13:30 → 리스본 19:40", url:"" },
    { type:"기차표", title:"기차표 · 이솔찬 (8/4 AP125)", sub:"리스본 09:15 → 포르투 12:10", url:"" },
    { type:"기차표", title:"기차표 · 황지현 (8/4 AP125)", sub:"리스본 09:15 → 포르투 12:10", url:"" },
    { type:"기차표", title:"기차표(귀국) · 포르투 → 리스본", sub:"8/7 09:00 출발", url:"" },
    { type:"입장권", title:"렐루 서점 입장권 · 8/5 09:15 (2인)", sub:"시간지정 · 늦으면 무효", url:"" },
    { type:"입장권", title:"페나 성 입장권 · 8/2 09:30 (2인)", sub:"시간지정 입장", url:"" },
    { type:"숙소", title:"로시오 플라자 바우처 (7/31~8/4)", sub:"리스본 · 4박", url:"" },
    { type:"숙소", title:"Vignette Collection 바우처 (8/4~8/7)", sub:"포르투 · 3박", url:"" },
    { type:"보험", title:"여행자 보험 증권", sub:"7/31 ~ 8/8", url:"" },
    { type:"기타", title:"렌터카 / 기타 예약", sub:"필요 시 여기에 추가", url:"" }
  ]
};
