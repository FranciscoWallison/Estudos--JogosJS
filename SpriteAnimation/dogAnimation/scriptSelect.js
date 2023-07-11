
animationStates.forEach((animation) => {
    console.log(animation)
    const option = new Option(animation.name, animation.name.toLowerCase());
    dropdown.options[dropdown.options.length] = option;
});