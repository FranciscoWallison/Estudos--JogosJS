const dropdown = document.getElementById("animations");

dropdown.addEventListener('change', function (e) {
    playerState = e.target.value;
})

animationStates.forEach((animation) => {
    console.log(animation)
    const option = new Option(animation.name, animation.name.toLowerCase());
    dropdown.options[dropdown.options.length] = option;
});