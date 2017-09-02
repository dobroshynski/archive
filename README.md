# fractals-java
a tool for graphing and viewing different fractals

- to plot a [Julia Set](https://en.wikipedia.org/wiki/Julia_set) with custom parameters a & b in format fc, c = a + bi, compile and run:
  - javac JuliaSet.java
  - java JuliaSet a b
- can also run with no custom initialization:
  - javac JuliaSet.java
  - java JuliaSet

- Some sample sets to try out:
  - java JuliaSet 0.5 -0.02
  - java JuliaSet 0.33 0.000052
