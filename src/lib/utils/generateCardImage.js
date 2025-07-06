//@ts-nocheck
export async function generateCardImage(templateUrl, titleText) {
	const img = new Image();
	img.crossOrigin = 'anonymous';
	img.src = templateUrl;

	await new Promise((resolve) => (img.onload = resolve));

	const canvas = document.createElement('canvas');
	canvas.width = img.width;
	canvas.height = img.height;
	const ctx = canvas.getContext('2d');

	// Draw original image
	ctx.drawImage(img, 0, 0);

	// Set text style
	ctx.fillStyle = 'white';
	ctx.font = '600 45px sans-serif';
	ctx.textAlign = 'center';
	ctx.textBaseline = 'top';

	const padding = 10;
	const columnX = canvas.width * 0.3;
	const columnWidth = canvas.width * 0.4;
	const textAreaX = columnX + columnWidth / 2;
	const textAreaWidth = columnWidth - 2 * padding;
	const textAreaY = padding;
	const textAreaHeight = canvas.height - 2 * padding;

	const words = titleText.split(' ');
	let line = '';
	const lines = [];
	for (let n = 0; n < words.length; n++) {
		const testLine = line + words[n] + ' ';
		const metrics = ctx.measureText(testLine);
		const testWidth = metrics.width;
		if (testWidth > textAreaWidth && n > 0) {
			lines.push(line);
			line = words[n] + ' ';
		} else {
			line = testLine;
		}
	}
	lines.push(line.trim());

	const lineHeight = 46;
	const totalTextHeight = lines.length * lineHeight;
	let y = textAreaY + (textAreaHeight - totalTextHeight) / 2;

	for (let i = 0; i < lines.length; i++) {
		ctx.fillText(lines[i], textAreaX, y);
		y += lineHeight;
	}

	// return canvas.toDataURL('image/png').split(',')[1];
	// Return full Base64 URL
	return canvas.toDataURL('image/png');
}
