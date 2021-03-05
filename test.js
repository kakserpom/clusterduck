function a() {
    console.log(arguments)
}

a(10, ...[1,2,3])