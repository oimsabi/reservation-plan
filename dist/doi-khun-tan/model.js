/* Pure planning calculations, shared by the UI and calculation checks. */
const TripMath = {
  integer(value, fallback, max) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.min(max, Math.max(1, Math.round(n))) : fallback;
  },
  houses(stays, ids, people, nights, useNetPrice = false) {
    const selected = stays.filter(h => h.type === 'house' && new Set(ids).has(h.id));
    const sum = key => selected.reduce((total, h) => total + h[key], 0);
    const total = selected.reduce((total, h) => total + (useNetPrice ? h.netPrice : h.price), 0) * nights;
    return { count: selected.length, total, perPerson: total / people, capacity: sum('capacity'), bathrooms: sum('bathrooms'), bedrooms: sum('bedrooms'), enough: sum('capacity') >= people };
  },
  camping(people, nights, options = {}) {
    const { rent = true, bag = true, mat = true, pillow = false, ground = true } = options;
    const tents = rent ? Math.ceil(people / 2) : 0;
    const area = (ground || !rent) ? people * 30 * nights : 0;
    const gear = rent ? people * ((bag ? 30 : 0) + (mat ? 20 : 0) + (pillow ? 10 : 0)) * nights : 0;
    return { tents, area, gear, min: area + gear + tents * 160 * nights, max: area + gear + tents * 225 * nights };
  }
};
if (typeof module !== 'undefined') module.exports = TripMath;
