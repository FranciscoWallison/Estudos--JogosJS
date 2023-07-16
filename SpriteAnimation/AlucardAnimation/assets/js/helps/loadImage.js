function loadImage(url) {
    return new Promise((resolve, reject) => {
      let image = new Image()
      
      image.onload = () => resolve(image)
      const msg = `Could not load image at ${url}`
      image.onerror = () => reject(new Error(msg))
      image.src = url  
    })
}