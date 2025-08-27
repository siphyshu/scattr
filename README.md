
<div align="center">

<img width="600" height="271" alt="scattr logo" src="https://github.com/user-attachments/assets/28a71f87-55d9-4d9e-9b69-dacb8800e1cc" />

**Generate visually rich layouts in seconds ✨**

scattr is a smart asset layout generator that creates beautiful, naturally-distributed layouts from your images. Perfect for creating collages, mood boards, wallpapers, and artistic compositions with visually rich spacing and arrangement.

[![MIT License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen.svg)](https://scattr.siphyshu.me)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)](https://html.spec.whatwg.org/)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)](https://www.w3.org/TR/CSS/)
[![Open Source](https://img.shields.io/badge/Open%20Source-❤️-red.svg)](https://github.com/siphyshu/scattr/)

✨ **Try it live at [scattr.siphyshu.me](https://scattr.siphyshu.me)** ✨

</div>

## Demo

https://github.com/user-attachments/assets/6cca1861-3d7a-4e4f-ad2f-fd7eec43cc72

## ✨ Features

- **Smart layout generation** - Creates natural, organic spacing using advanced algorithms
- **Flexible customization** - Control spacing, density, rotation, and scaling
- **Rich backgrounds** - Solid colors, gradients, custom images, or transparent
- **High-quality export** - Save your layouts as PNG / JPG at any resolution

## 🛠️ How It Works

scattr implements **Bridson's Fast Poisson Disk Sampling algorithm** to create natural-looking layouts:

1. **Spatial grid optimization** - Uses a background grid for fast neighbor lookups
2. **Active sample management** - Maintains a list of potential placement points  
3. **Collision detection** - Ensures minimum spacing requirements are met
4. **Rejection sampling** - Tries multiple candidate positions to find valid placements

This approach creates organic, non-uniform distributions that look natural while being mathematically sound - no overlapping assets, no awkward clustering, just beautiful spacing every time.

## 🎛️ Configuration Options

### Layout Parameters
- **Item Spacing**: Controls spacing between assets (10-200px)
- **Fill Density**: How densely packed your layout should be (Sparse to Dense)
- **Asset Size**: Global scaling factor for all assets (Tiny to Huge)

### Visual Effects
- **Random Rotation**: Enable/disable with custom angle ranges (-180° to 180°)
- **Random Scale**: Variable sizing with min/max scale factors (0.1x to 5.0x)
- **Unique Assets Only**: Prevent duplicate asset placement

### Background Options
- **Solid Colors**: Advanced color picker with hex input
- **Gradients**: Multi-stop gradients with drag-and-drop editing
- **Images**: Upload custom background images
- **Transparency**: Export with transparent backgrounds

## 🤝 Contributing

Contributions are welcome! Here are some areas where you can help:

- **Algorithm improvements** - Optimize the Poisson sampling implementation
- **New features** - Add export formats, layout templates, or visual effects  
- **UI enhancements** - Improve the user interface and experience
- **Documentation** - Help explain complex concepts and usage patterns
- **Bug fixes** - Report and fix issues you encounter

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

<div align="center">

**Made with ❤️ for creators who love beautiful layouts**

*Generate your next masterpiece at [scattr.siphyshu.me](https://scattr.siphyshu.me)*

</div>
