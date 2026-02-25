/**
 * TIE BREAK PADEL — 完全カードデータ（実物相性マトリックス準拠）
 * - 81枚（ゲームカード）＋ SERVICIO 1枚（別扱い推奨）
 * - “出されたカード(current)”に対して“次に出せるカード(next)”を判定できる
 *
 * 重要ルール（あなた確定情報）
 * - REMATE×3 は「GLOBO(青2) / SOY UN MURO(青PRO) / 特殊(黄)」でしか返せない
 * - 特殊(黄)は基本いつでも出せる（WILD）
 * - ただし HAS TOCADO LA RED だけは、場が「赤(A*) / 黄(特殊) / 緑PRO(SALGO★)」のときだけ出せる
 *
 * ここでは “カード名ベース”で相性を定義。
 */

/** ===== 1) カードID（固定） ===== */
export const CARD_ID = {
    // Blue (Defensa)
    GOLPE: "GOLPE_DEFENSIVO", // 青1
    GLOBO: "GLOBO",          // 青2
    MURO: "SOY_UN_MURO",     // 青PRO

    // Green (Transición)
    BLOQUEO: "BLOQUEO",                 // 緑1
    PASSING: "PASSING",                 // 緑2
    SALGO: "SALGO_POR_LA_PUERTA",       // 緑PRO（★）

    // Red (Ataque)
    BANDEJA: "BANDEJA",                 // 赤1
    VOLEA: "VOLEA",                     // 赤1
    BAJADA: "BAJADA_DE_PARED",          // 赤1
    ENTERRADORA: "ENTERRADORA",         // 赤PRO
    REMATE: "REMATE_X3",                // 赤2（最強）

    // Yellow (Especial)
    NEVERA: "NEVERA",
    PALA_ROTA: "PALA_ROTA",
    PINCHADA: "PELOTA_PINCHADA",
    RED: "HAS_TOCADO_LA_RED",
    BLANCA: "CARTA_BLANCA" // 無地（ジョーカー扱い）
};

/** ===== 2) “出されたカード → 次に出せるカード” 相性（最終確定版） =====
 * これは「currentCardに対して nextCard を出せるか」を判定するための “許可リスト”。
 * ※特殊(黄)は基本ワイルドなので、各行に追加せず、判定関数側で処理する（REDのみ例外）。
 */
export const RESPONDABLE_BY = {
    // current: 青
    [CARD_ID.GOLPE]: [CARD_ID.GOLPE, CARD_ID.GLOBO, CARD_ID.MURO, CARD_ID.BLOQUEO, CARD_ID.SALGO,
    CARD_ID.BANDEJA, CARD_ID.VOLEA, CARD_ID.BAJADA],
    [CARD_ID.GLOBO]: [CARD_ID.GOLPE, CARD_ID.GLOBO, CARD_ID.MURO, CARD_ID.BLOQUEO, CARD_ID.SALGO,
    CARD_ID.BANDEJA, CARD_ID.VOLEA, CARD_ID.BAJADA],
    [CARD_ID.MURO]: [CARD_ID.GOLPE, CARD_ID.GLOBO, CARD_ID.MURO, CARD_ID.BLOQUEO, CARD_ID.SALGO,
    CARD_ID.BANDEJA, CARD_ID.VOLEA, CARD_ID.BAJADA, CARD_ID.ENTERRADORA, CARD_ID.REMATE],

    // current: 緑
    [CARD_ID.BLOQUEO]: [CARD_ID.BLOQUEO, CARD_ID.PASSING, CARD_ID.SALGO,
    CARD_ID.BANDEJA, CARD_ID.VOLEA, CARD_ID.BAJADA, CARD_ID.ENTERRADORA, CARD_ID.REMATE],
    [CARD_ID.PASSING]: [CARD_ID.GOLPE, CARD_ID.GLOBO, CARD_ID.MURO,
    CARD_ID.BLOQUEO, CARD_ID.PASSING, CARD_ID.SALGO,
    CARD_ID.BANDEJA, CARD_ID.VOLEA, CARD_ID.BAJADA],
    [CARD_ID.SALGO]: [CARD_ID.SALGO, CARD_ID.REMATE],

    // current: 赤
    [CARD_ID.BANDEJA]: [CARD_ID.GOLPE, CARD_ID.GLOBO, CARD_ID.MURO],
    [CARD_ID.VOLEA]: [CARD_ID.GOLPE, CARD_ID.GLOBO, CARD_ID.MURO, CARD_ID.BLOQUEO],
    [CARD_ID.BAJADA]: [CARD_ID.GOLPE, CARD_ID.GLOBO, CARD_ID.MURO],
    [CARD_ID.ENTERRADORA]: [CARD_ID.GOLPE, CARD_ID.GLOBO, CARD_ID.MURO, CARD_ID.BLOQUEO],
    [CARD_ID.REMATE]: [CARD_ID.GLOBO, CARD_ID.MURO] // ＋ 特殊（黄）は判定関数側で許可
};

/** ===== 3) カード定義（見た目/UI用メタ情報） ===== */
export const CARD_DEFS = {
    // Blue
    [CARD_ID.GOLPE]: {
        id: CARD_ID.GOLPE,
        nameEs: "GOLPE DEFENSIVO",
        nameJa: "守備ショット",
        color: "blue",
        tier: 1,
        role: "defense",
        descriptionJa: "安全に返してラリーをつなぐ基本の守備。"
    },
    [CARD_ID.GLOBO]: {
        id: CARD_ID.GLOBO,
        nameEs: "GLOBO",
        nameJa: "ロブ",
        color: "blue",
        tier: 2,
        role: "defense",
        descriptionJa: "相手を下げて時間を作る。レマテ×3を返せる貴重な守備。"
    },
    [CARD_ID.MURO]: {
        id: CARD_ID.MURO,
        nameEs: "SOY UN MURO",
        nameJa: "鉄壁（俺は壁だ）",
        color: "blue",
        tier: 99, // PRO
        role: "defense",
        descriptionJa: "多くの攻撃に対応できる万能守備。レマテ×3も返せる。"
    },

    // Green
    [CARD_ID.BLOQUEO]: {
        id: CARD_ID.BLOQUEO,
        nameEs: "BLOQUEO",
        nameJa: "ブロック",
        color: "green",
        tier: 1,
        role: "transition",
        descriptionJa: "攻撃を止めつつ切り返すトランジション。赤系に強い。"
    },
    [CARD_ID.PASSING]: {
        id: CARD_ID.PASSING,
        nameEs: "PASSING",
        nameJa: "パッシング",
        color: "green",
        tier: 2,
        role: "transition",
        descriptionJa: "前衛の横を抜く/流れを変える。守備や攻撃(赤)にもつながる。"
    },
    [CARD_ID.SALGO]: {
        id: CARD_ID.SALGO,
        nameEs: "SALGO POR LA PUERTA",
        nameJa: "ドアから出る（場外救出）",
        color: "green",
        tier: 99, // PRO
        role: "transition",
        descriptionJa: "超限定の強カード。返せるのは同カード・レマテ×3・特殊など。"
    },

    // Red
    [CARD_ID.BANDEJA]: {
        id: CARD_ID.BANDEJA,
        nameEs: "BANDEJA",
        nameJa: "バンデッハ",
        color: "red",
        tier: 1,
        role: "attack",
        descriptionJa: "前を維持しながら攻める。返せるのは基本的に青のみ。"
    },
    [CARD_ID.VOLEA]: {
        id: CARD_ID.VOLEA,
        nameEs: "VOLEA",
        nameJa: "ボレー",
        color: "red",
        tier: 1,
        role: "attack",
        descriptionJa: "前で圧をかける攻撃。守備(青)やブロックで返されやすい。"
    },
    [CARD_ID.BAJADA]: {
        id: CARD_ID.BAJADA,
        nameEs: "BAJADA DE PARED",
        nameJa: "バハーダ（壁後の攻撃）",
        color: "red",
        tier: 1,
        role: "attack",
        descriptionJa: "壁を使って攻撃に転じる。返せるのは基本青のみ。"
    },
    [CARD_ID.ENTERRADORA]: {
        id: CARD_ID.ENTERRADORA,
        nameEs: "ENTERRADORA",
        nameJa: "叩きつけ（強打）",
        color: "red",
        tier: 99, // PRO
        role: "attack",
        descriptionJa: "強い攻撃。守備(青)やブロックで返せる。"
    },
    [CARD_ID.REMATE]: {
        id: CARD_ID.REMATE,
        nameEs: "REMATE x3",
        nameJa: "レマテ×3",
        color: "red",
        tier: 2,
        role: "attack",
        descriptionJa: "最強攻撃。返せるのはロブ/鉄壁/特殊のみ。"
    },

    // Yellow
    [CARD_ID.NEVERA]: {
        id: CARD_ID.NEVERA,
        nameEs: "NEVERA",
        nameJa: "ネベラ（冷凍）",
        color: "yellow",
        tier: 0,
        role: "special",
        descriptionJa: "特殊。基本ワイルド（いつでも出せる）。効果は実装側で。"
    },
    [CARD_ID.PALA_ROTA]: {
        id: CARD_ID.PALA_ROTA,
        nameEs: "PALA ROTA",
        nameJa: "ラケット破損",
        color: "yellow",
        tier: 0,
        role: "special",
        descriptionJa: "特殊。基本ワイルド（いつでも出せる）。効果は実装側で。"
    },
    [CARD_ID.PINCHADA]: {
        id: CARD_ID.PINCHADA,
        nameEs: "PELOTA PINCHADA",
        nameJa: "ボールがパンク",
        color: "yellow",
        tier: 0,
        role: "special",
        descriptionJa: "特殊。基本ワイルド（いつでも出せる）。効果は実装側で。"
    },
    [CARD_ID.RED]: {
        id: CARD_ID.RED,
        nameEs: "HAS TOCADO LA RED",
        nameJa: "ネットタッチ",
        color: "yellow",
        tier: 0,
        role: "special_restricted",
        descriptionJa: "特殊（制限あり）。場が赤/黄/緑PROのときだけ出せる。"
    },
    [CARD_ID.BLANCA]: {
        id: CARD_ID.BLANCA,
        nameEs: "CARTA BLANCA",
        nameJa: "白紙（ジョーカー）",
        color: "yellow",
        tier: 0,
        role: "special",
        descriptionJa: "特殊。基本ワイルド（いつでも出せる）。使い方は実装側で。"
    }
};

/** ===== 4) デッキ枚数（あなたの集計に準拠：ゲームカード81枚） ===== */
export const DECK_COUNTS_81 = {
    // Blue
    [CARD_ID.GOLPE]: 11,
    [CARD_ID.GLOBO]: 11,
    [CARD_ID.MURO]: 5,

    // Green
    [CARD_ID.BLOQUEO]: 6,
    [CARD_ID.PASSING]: 6,
    [CARD_ID.SALGO]: 4,

    // Red
    [CARD_ID.BANDEJA]: 8,
    [CARD_ID.ENTERRADORA]: 6,
    [CARD_ID.VOLEA]: 7,
    [CARD_ID.BAJADA]: 5,
    [CARD_ID.REMATE]: 7,

    // Yellow
    [CARD_ID.NEVERA]: 1,
    [CARD_ID.PALA_ROTA]: 1,
    [CARD_ID.PINCHADA]: 1,
    [CARD_ID.RED]: 1,
    [CARD_ID.BLANCA]: 1
};

/** ===== 5) SERVICIO（別枠1枚） =====
 * 物理では「サービスカード1枚」は“ゲームカード81枚”とは別枠。
 * デジタルでは「ラリー最初の場カードを決める」役にすると扱いやすい。
 */
export const SERVICIO_CARD = {
    id: "SERVICIO",
    nameEs: "SERVICIO",
    nameJa: "サーブ",
    color: "service",
    tier: 0,
    role: "service",
    descriptionJa: "ポイント開始カード（実装でルール化）。"
};

/** ===== 6) 出せる判定（最重要） ===== */
export function isRedCardId(cardId) {
    return (
        cardId === CARD_ID.BANDEJA ||
        cardId === CARD_ID.VOLEA ||
        cardId === CARD_ID.BAJADA ||
        cardId === CARD_ID.ENTERRADORA ||
        cardId === CARD_ID.REMATE
    );
}

export function isYellowCardId(cardId) {
    return (
        cardId === CARD_ID.NEVERA ||
        cardId === CARD_ID.PALA_ROTA ||
        cardId === CARD_ID.PINCHADA ||
        cardId === CARD_ID.RED ||
        cardId === CARD_ID.BLANCA
    );
}

/**
 * currentId: 場のカードID
 * nextId: 出したいカードID
 */
export function canPlay(nextId, currentId) {
    // 特殊カードは各1枚しかないため、同じ特殊カードに対して同じ特殊カードを出すことはできない
    if (isYellowCardId(nextId) && nextId === currentId) {
        return false;
    }

    // 1) 特殊（黄）の基本ルール
    // ラケット破損、ボールがパンク、ネットタッチ は即時得点ややり直し（ラリー終了）のため、次に出せるカードは存在しない
    if (currentId === CARD_ID.PALA_ROTA || currentId === CARD_ID.PINCHADA || currentId === CARD_ID.RED) {
        return false;
    }

    // それ以外の特殊カード（ジョーカー、ネベラなど）が場にある場合は、次にどんなカードでも出せる（※同じカードは上でブロック済）
    if (isYellowCardId(currentId)) return true;

    if (nextId === CARD_ID.RED) {
        // HAS TOCADO LA RED は制限あり：赤 / 黄 / 緑PRO のときだけ
        if (isRedCardId(currentId)) return true;
        if (isYellowCardId(currentId)) return true;
        if (currentId === CARD_ID.SALGO) return true; // 黄色回転＝緑PRO解釈OK
        return false;
    }
    if (isYellowCardId(nextId)) {
        // RED以外の黄色は「いつでもOK」
        return true;
    }

    // 2) 通常カード：相性リストで判定
    const allowed = RESPONDABLE_BY[currentId] || [];
    return allowed.includes(nextId);
}

/** ===== 7) 81枚デッキ生成（シャッフル前） ===== */
export function buildDeck81() {
    /** @type {string[]} cardIds */
    const cardIds = [];
    for (const [id, count] of Object.entries(DECK_COUNTS_81)) {
        for (let i = 0; i < count; i++) cardIds.push(id);
    }
    return cardIds;
}

/** ===== 8) シャッフル（Fisher–Yates） ===== */
export function shuffleInPlace(arr, rng = Math.random) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

/** ===== 9) 便利：カードID→表示名 ===== */
export function cardLabel(cardId, lang = "ja") {
    if (cardId === "SERVICIO") return lang === "ja" ? "サーブ" : "SERVICIO";
    const def = CARD_DEFS[cardId];
    if (!def) return cardId;
    return lang === "ja" ? def.nameJa : def.nameEs;
}
