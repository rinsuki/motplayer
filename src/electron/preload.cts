setTimeout(() => {
    const canvas = document.querySelector('canvas');
    if (canvas == null) {
        console.warn("Canvas is still not found")
        return
    }
    console.log("Resize canvas to window size", canvas.width, canvas.height)
    resizeTo(canvas.width + (outerWidth - innerWidth), canvas.height + (outerHeight - innerHeight))
}, 2000);