// Tiny helper for drawing "pixel grid" sprites onto a canvas.
// A sprite is { palette: {char: cssColor}, rows: [string, ...] }.
// Each character in a row maps to a color via palette; '.' is transparent.

export function drawSprite(ctx, sprite, dx, dy, cell, flipX = false) {
  const { palette, rows } = sprite;
  const w = rows[0].length;

  ctx.save();
  if (flipX) {
    ctx.translate(dx + w * cell, dy);
    ctx.scale(-1, 1);
  } else {
    ctx.translate(dx, dy);
  }

  for (let row = 0; row < rows.length; row++) {
    const line = rows[row];
    for (let col = 0; col < line.length; col++) {
      const ch = line[col];
      if (ch === "." || ch === " ") continue;
      const color = palette[ch];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(col * cell, row * cell, cell, cell);
    }
  }

  ctx.restore();
}

export function spriteHeight(sprite, cell) {
  return sprite.rows.length * cell;
}

export function spriteWidth(sprite, cell) {
  return sprite.rows[0].length * cell;
}
