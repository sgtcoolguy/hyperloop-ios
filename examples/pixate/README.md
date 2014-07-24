## Pixate Freestyle example

This example demonstrates how to use external framework with Hyperloop. You can get Pixate Freestyle for iOS at [https://github.com/Pixate/pixate-freestyle-ios](https://github.com/Pixate/pixate-freestyle-ios)

## Install

- Download latest Pixate Freestyle from [https://github.com/Pixate/pixate-freestyle-ios/releases](https://github.com/Pixate/pixate-freestyle-ios/releases)
- Extract donwlowded zip and place PixateFreestyle.framework into anywhere, like PIXATE_FRAMEWORK_DIR

## Run

```bash
bin/hyperloop clean compile package launch --platform=ios --log-level=trace --src=../hyperloop-ios/examples/pixate --arch=i386 --frameworks=PixateFreestyle --F=PIXATE_FRAMEWORK_DIR
```
