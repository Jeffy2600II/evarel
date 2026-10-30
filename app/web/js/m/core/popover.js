const popPlace = (r, w, h, vw, vh, o = {}) => {
  let left = o.align === "right" ? r.right - w : o.align === "center" ? r.left + r.width / 2 - w / 2 : r.left;
  left = Math.max(8, Math.min(vw - w - 8, left));
  const below = o.prefer !== "up" && r.bottom + 6 + h < vh - 8, top = below ? r.bottom + 6 : Math.max(8, r.top - h - 8);
  return { left, top, below };
};
export {
  popPlace
};
