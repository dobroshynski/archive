import java.awt.*;
import java.awt.image.BufferedImage;
import javax.swing.*;

public class JuliaSet extends JPanel {
    private final int maxIter = 100;
    private final double zoom = 1;
    private double cX;
    private double cY;



    public JuliaSet(double a, double b) {
        setPreferredSize(new Dimension(800, 600));
        setBackground(Color.white);
        cX = a;
        cY = b;
    }

    void drawJuliaSet(Graphics2D g) {
        int w = getWidth();
        int h = getHeight();
        BufferedImage image = new BufferedImage(w, h,
                BufferedImage.TYPE_INT_RGB);

        // cX = -0.7;
        // cY = 0.27015;


          // System.out.println("running");
          double moveX = 0, moveY = 0;
          double zx, zy;

          for (int x = 0; x < w; x++) {
              for (int y = 0; y < h; y++) {
                  zx = 1.5 * (x - w / 2) / (0.5 * zoom * w) + moveX;
                  zy = (y - h / 2) / (0.5 * zoom * h) + moveY;
                  float i = maxIter;
                  while (zx * zx + zy * zy < 4 && i > 0) {
                      double tmp = zx * zx - zy * zy + cX;
                      zy = 2.0 * zx * zy + cY;
                      zx = tmp;
                      i--;
                  }
                  int c = Color.HSBtoRGB((maxIter / 1 / i) % 2, 1, i > 0 ? 1 : 0);
                  image.setRGB(x, y, c);
              }
          }
          System.out.println(image);
          g.drawImage(image, 0, 0, null);
    }

    public void update(Graphics g){

    }

    @Override
    public void paintComponent(Graphics gg) {
        super.paintComponent(gg);
        Graphics2D g = (Graphics2D) gg;
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING,
                RenderingHints.VALUE_ANTIALIAS_ON);
        drawJuliaSet(g);
    }

    public static void main(String[] args) {
        SwingUtilities.invokeLater(() -> {
            JFrame f = new JFrame();

            f.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
            f.setTitle("Julia Set");
            f.setResizable(false);

            double a = 0;
            double b = -0.8;
            // while(a < 0 && b > 0) {
            //
            //   f.add(new JuliaSet(a,b), BorderLayout.CENTER);
            //   f.pack();
            //   f.setLocationRelativeTo(null);
            //   f.validate();
            //   f.repaint();
            //   f.setVisible(true);
            //   a += 0.001;
            //   b -= 0.001;
            //   final Timer timer = new Timer(1000, null);
            //   timer.start();
            // }


            f.add(new JuliaSet(a,b), BorderLayout.CENTER);
            // f.validate();
            // f.repaint();
            f.pack();
            f.setLocationRelativeTo(null);
            f.setVisible(true);
        });
    }
}
