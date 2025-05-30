# Background Images Setup

To complete the background image switcher feature, you need to manually add three background images to the project:

## Required Files

Please add the following files to the `frontend/src/assets/` directory:

1. `beijin1.jpg` - Default background image of Beijing
2. `beijin2.jpg` - Alternative Beijing scene
3. `beijin3.jpg` - Another Beijing scene

## Image Requirements

- Image resolution: Recommend 1920x1080 or higher
- File format: JPG
- File size: Keep under 5MB each for better performance
- The images should be landscape orientation for best display

## How to Add the Images

1. Find suitable Beijing cityscape images (from your own collection or licensed sources)
2. Rename them to match the required filenames
3. Copy them to the `frontend/src/assets/` directory
4. Restart your development server

If the images are already loaded in the assets folder but with different names, you can either:
- Rename your existing files to match the required names, or
- Update the import statements in `frontend/src/components/BackgroundSelector.js` to match your existing filenames

## Troubleshooting

If the background switcher doesn't work after adding the images:

- Check the browser console for any errors
- Make sure the filenames match exactly (case-sensitive)
- Verify that the images are in the correct directory
- Try clearing your browser cache 