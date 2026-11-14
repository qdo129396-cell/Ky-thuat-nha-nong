import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type pg from "pg";
import { loadEnv } from "../config/env.js";
import { createPool } from "./pool.js";
import { ArgonPasswordHasher } from "../services/password-hasher.js";
import { toSlug } from "../common/utils.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const seedFile = path.resolve(currentDir, "../../database/seeds/001_core.sql");

interface DemoPost {
  title: string;
  slug: string;
  categorySlug: string;
  cropName: string;
  excerpt: string;
  contentHtml: string;
}

const demoPosts: DemoPost[] = [
  {
    title: "Ngâm ủ hạt giống lúa để mạ khỏe",
    slug: "ngam-u-hat-giong-lua-de-ma-khoe",
    categorySlug: "ky-thuat-trong-trot",
    cropName: "Lúa",
    excerpt: "Ba bước đơn giản giúp chọn hạt chắc, ngâm đúng thời gian và gieo mạ đồng đều.",
    contentHtml: "<p>Trước khi ngâm, hãy loại bỏ hạt lép bằng nước muối loãng rồi rửa lại bằng nước sạch. Hạt chắc giúp ruộng mạ mọc đều và giảm công dặm sau này.</p><p>Ngâm hạt theo thời tiết, thay nước nếu nước có mùi và ủ nơi thoáng. Khi hạt vừa nứt nanh thì gieo ngay trên nền mạ đủ ẩm.</p>"
  },
  {
    title: "Làm luống rau cải thoát nước nhanh",
    slug: "lam-luong-rau-cai-thoat-nuoc-nhanh",
    categorySlug: "ky-thuat-trong-trot",
    cropName: "Rau cải",
    excerpt: "Cách lên luống và bố trí rãnh giúp rau cải ít úng khi gặp mưa bất chợt.",
    contentHtml: "<p>Luống rau nên cao hơn rãnh và có mặt luống hơi vồng để nước chảy sang hai bên. Không nén đất quá chặt vì rễ cải cần không khí để phát triển.</p><p>Sau mưa, mở nhanh các điểm nghẽn ở đầu rãnh và kiểm tra lá già sát đất. Việc thoát nước sớm giúp hạn chế thối gốc và vàng lá.</p>"
  },
  {
    title: "Tỉa cành cà chua đúng thời điểm",
    slug: "tia-canh-ca-chua-dung-thoi-diem",
    categorySlug: "ky-thuat-trong-trot",
    cropName: "Cà chua",
    excerpt: "Tỉa chồi nách hợp lý giúp cây thông thoáng và tập trung dinh dưỡng cho chùm quả.",
    contentHtml: "<p>Chỉ tỉa những chồi nách nhỏ, dùng kéo sạch và thực hiện vào buổi sáng khô ráo. Tránh cắt quá nhiều lá một lúc vì cây cần lá để quang hợp.</p><p>Giữ lại thân chính khỏe, buộc thân vào cọc hoặc dây đỡ và theo dõi vết cắt trong vài ngày. Cây thông thoáng sẽ dễ chăm sóc và quan sát sâu bệnh hơn.</p>"
  },
  {
    title: "Nhận biết sớm rầy nâu trên lúa",
    slug: "nhan-biet-som-ray-nau-tren-lua",
    categorySlug: "phong-tru-sau-benh",
    cropName: "Lúa",
    excerpt: "Quan sát gốc lúa định kỳ để phát hiện rầy nâu trước khi chúng gây hại thành ổ.",
    contentHtml: "<p>Rầy nâu thường tập trung ở phần gốc, vì vậy cần vạch bụi lúa và kiểm tra ở nhiều điểm trong ruộng. Ghi lại mật độ và khu vực xuất hiện để xử lý đúng chỗ.</p><p>Giữ ruộng thông thoáng, bón phân cân đối và ưu tiên biện pháp theo hướng dẫn địa phương. Không phun thuốc theo cảm tính khi chưa xác định mật độ gây hại.</p>"
  },
  {
    title: "Dùng dung dịch tỏi ớt để xua sâu hại",
    slug: "dung-dung-dich-toi-ot-de-xua-sau-hai",
    categorySlug: "phong-tru-sau-benh",
    cropName: "Rau ăn lá",
    excerpt: "Một cách hỗ trợ xua côn trùng trên diện tích nhỏ, cần thử trước trên vài cây.",
    contentHtml: "<p>Tỏi và ớt có mùi mạnh, có thể dùng như biện pháp hỗ trợ khi sâu mới xuất hiện. Lọc kỹ dung dịch trước khi phun để tránh nghẹt béc phun.</p><p>Hãy thử trên một góc vườn trước, phun vào chiều mát và theo dõi phản ứng của lá. Biện pháp này không thay thế việc vệ sinh vườn và kiểm tra sâu hại thường xuyên.</p>"
  },
  {
    title: "Theo dõi bệnh sương mai trên dưa",
    slug: "theo-doi-benh-suong-mai-tren-dua",
    categorySlug: "phong-tru-sau-benh",
    cropName: "Dưa leo",
    excerpt: "Dấu hiệu lá và việc giữ giàn dưa khô thoáng giúp giảm nguy cơ bệnh sương mai.",
    contentHtml: "<p>Khi sáng sớm có nhiều sương hoặc sau mưa kéo dài, hãy quan sát mặt lá để phát hiện vết vàng bất thường. Tỉa lá bệnh và thu gom ra khỏi vườn thay vì bỏ tại rãnh.</p><p>Buộc dây để tán lá không chạm đất, tưới vào vùng gốc và tránh làm ướt lá về chiều. Ghi nhận ngày xuất hiện bệnh để điều chỉnh lịch chăm sóc.</p>"
  },
  {
    title: "Ủ phân hữu cơ từ phụ phẩm vườn",
    slug: "u-phan-huu-co-tu-phu-pham-vuon",
    categorySlug: "dat-va-dinh-duong",
    cropName: "Nhiều loại cây",
    excerpt: "Tận dụng lá khô, cỏ non và phụ phẩm sạch để tạo nguồn hữu cơ cho đất.",
    contentHtml: "<p>Xếp xen kẽ lớp vật liệu khô và vật liệu xanh, giữ đống ủ đủ ẩm nhưng không sũng nước. Đảo đống định kỳ để không khí đi vào và phân hủy đồng đều.</p><p>Không dùng cây bệnh hoặc rác có hóa chất trong đống ủ. Khi vật liệu tơi, màu sẫm và không còn mùi hăng, có thể trộn vào đất trước vụ mới.</p>"
  },
  {
    title: "Kiểm tra pH đất trước vụ rau mới",
    slug: "kiem-tra-ph-dat-truoc-vu-rau-moi",
    categorySlug: "dat-va-dinh-duong",
    cropName: "Rau màu",
    excerpt: "Đo pH ở vài vị trí giúp người trồng điều chỉnh đất có cơ sở hơn.",
    contentHtml: "<p>Lấy mẫu đất ở nhiều điểm, tránh sát mép luống và trộn đều trước khi thử. Ghi lại kết quả theo từng khu để so sánh giữa các vụ.</p><p>Nếu cần điều chỉnh, nên làm từ từ và kết hợp bổ sung chất hữu cơ. Không bón dồn nhiều loại vật tư trong cùng một ngày vì khó theo dõi tác động lên cây.</p>"
  },
  {
    title: "Bón kali cho cây ăn quả giai đoạn nuôi quả",
    slug: "bon-kali-cho-cay-an-qua-giai-doan-nuoi-qua",
    categorySlug: "dat-va-dinh-duong",
    cropName: "Cây ăn quả",
    excerpt: "Cách chia lần bón và quan sát tán cây khi quả bắt đầu lớn.",
    contentHtml: "<p>Giai đoạn nuôi quả cần theo dõi sức cây, độ ẩm đất và số lượng quả trên cành. Chia lượng bón thành các đợt nhỏ giúp rễ hấp thu ổn định hơn.</p><p>Bón cách gốc một khoảng phù hợp, sau đó tưới nhẹ nếu đất khô. Nên ghi chép lượng đã bón để tránh lặp lại quá mức ở lần chăm sóc sau.</p>"
  },
  {
    title: "Tưới nhỏ giọt cho vườn rau mùa khô",
    slug: "tuoi-nho-giot-cho-vuon-rau-mua-kho",
    categorySlug: "tuoi-tieu",
    cropName: "Rau màu",
    excerpt: "Một lịch tưới linh hoạt theo độ ẩm đất thay vì chỉ nhìn vào số ngày.",
    contentHtml: "<p>Đặt đầu tưới gần vùng rễ và kiểm tra lưu lượng ở đầu, giữa, cuối hàng. Tưới chậm giúp nước thấm sâu hơn và hạn chế bốc hơi vào giữa trưa.</p><p>Trước khi tăng thời gian tưới, hãy kiểm tra đất ở độ sâu vùng rễ. Nếu đất vẫn đủ ẩm, không cần tưới thêm chỉ vì lịch đã định sẵn.</p>"
  },
  {
    title: "Lịch tưới lúa giai đoạn đẻ nhánh",
    slug: "lich-tuoi-lua-giai-doan-de-nhanh",
    categorySlug: "tuoi-tieu",
    cropName: "Lúa",
    excerpt: "Theo dõi mực nước và tình trạng ruộng để điều chỉnh tưới trong giai đoạn đẻ nhánh.",
    contentHtml: "<p>Ruộng cần giữ ẩm phù hợp để rễ phát triển nhưng không nên để nước quá sâu liên tục. Quan sát màu lá, số nhánh và bề mặt đất để đánh giá nhu cầu nước.</p><p>Ưu tiên lấy nước khi nguồn nước thuận lợi và chủ động tháo bớt khi có mưa lớn. Ghi chép các lần cấp nước giúp rút kinh nghiệm cho những vụ sau.</p>"
  },
  {
    title: "Giữ ẩm đất bằng rơm sau khi trồng",
    slug: "giu-am-dat-bang-rom-sau-khi-trong",
    categorySlug: "tuoi-tieu",
    cropName: "Ớt",
    excerpt: "Phủ rơm đúng cách giúp đất bớt mất nước và hạn chế cỏ mọc trên luống.",
    contentHtml: "<p>Rơm cần sạch, khô và phủ thành lớp vừa phải quanh gốc, không áp sát thân cây. Chừa khoảng trống nhỏ để cổ rễ luôn thông thoáng.</p><p>Sau mưa, kiểm tra lớp phủ để tránh giữ ẩm quá lâu ở vùng gốc. Bổ sung thêm rơm khi lớp cũ phân hủy hoặc bị gió cuốn đi.</p>"
  },
  {
    title: "Thu hoạch rau lá vào buổi sáng",
    slug: "thu-hoach-rau-la-vao-buoi-sang",
    categorySlug: "thu-hoach-va-bao-quan",
    cropName: "Rau ăn lá",
    excerpt: "Thu hoạch lúc trời mát và xử lý nhẹ tay giúp rau giữ độ tươi lâu hơn.",
    contentHtml: "<p>Thu hoạch vào sáng sớm khi rau còn mát, dùng dụng cụ sạch và đặt rau nhẹ vào thùng thoáng. Loại riêng lá sâu, lá dập ngay tại vườn để giảm công phân loại sau đó.</p><p>Tránh để rau dưới nắng trực tiếp trong lúc chờ vận chuyển. Nếu cần rửa, dùng nước sạch và để ráo trước khi đóng gói.</p>"
  },
  {
    title: "Phơi và bảo quản hạt đậu sau thu hoạch",
    slug: "phoi-va-bao-quan-hat-dau-sau-thu-hoach",
    categorySlug: "thu-hoach-va-bao-quan",
    cropName: "Đậu xanh",
    excerpt: "Làm khô đủ độ và bảo quản kín giúp hạt đậu ít mốc, ít mọt hơn.",
    contentHtml: "<p>Phơi hạt trên bạt sạch, đảo đều và che lại khi trời có sương hoặc mưa. Hạt cần được làm nguội trước khi cho vào bao hoặc hũ.</p><p>Chọn nơi khô, cao và tránh sát tường ẩm. Kiểm tra định kỳ để phát hiện hạt đổi màu, có mùi lạ hoặc dấu hiệu côn trùng.</p>"
  },
  {
    title: "Chọn bao bì cho nông sản khô",
    slug: "chon-bao-bi-cho-nong-san-kho",
    categorySlug: "thu-hoach-va-bao-quan",
    cropName: "Nông sản khô",
    excerpt: "Bao bì sạch, phù hợp và có nhãn rõ ràng giúp việc bảo quản, giao nhận dễ hơn.",
    contentHtml: "<p>Chỉ đóng gói nông sản khi đã thật sự nguội và khô. Chọn bao bì không có mùi lạ, đủ kín với sản phẩm nhỏ nhưng vẫn phù hợp cho việc vận chuyển.</p><p>Ghi ngày đóng gói, lô hàng và nơi bảo quản trên nhãn. Thông tin đơn giản này giúp kiểm soát tồn kho và truy lại nguyên nhân khi chất lượng thay đổi.</p>"
  },
  {
    title: "Nhật ký vụ lúa tuần đầu sau gieo sạ",
    slug: "nhat-ky-vu-lua-tuan-dau-sau-gieo-sa",
    categorySlug: "nhat-ky-mua-vu",
    cropName: "Lúa",
    excerpt: "Ghi lại mực nước, tỷ lệ mọc và thời tiết trong tuần đầu để chăm ruộng chủ động hơn.",
    contentHtml: "<p>Ngày đầu sau gieo, tôi ghi lại mực nước từng thửa và thời điểm mưa. Sau ba ngày, kiểm tra những chỗ hạt mọc thưa để chuẩn bị dặm nếu cần.</p><p>Nhật ký ngắn mỗi ngày giúp nhận ra thay đổi nhỏ của ruộng. Cuối tuần, tôi so sánh ảnh chụp để đánh giá độ đồng đều của mạ.</p>"
  },
  {
    title: "Nhật ký vườn cà phê đầu mùa mưa",
    slug: "nhat-ky-vuon-ca-phe-dau-mua-mua",
    categorySlug: "nhat-ky-mua-vu",
    cropName: "Cà phê",
    excerpt: "Một ghi chép thực tế về việc dọn cỏ, kiểm tra thoát nước và theo dõi lộc mới.",
    contentHtml: "<p>Đầu mùa mưa, việc đầu tiên là thông rãnh và dọn cỏ cạnh gốc để nước không đọng. Tôi chia vườn thành từng khu nhỏ để kiểm tra đều hơn.</p><p>Sau mỗi trận mưa lớn, tôi ghi lại khu nào đất trôi nhiều hoặc có cành gãy. Những ghi chép này giúp sắp xếp việc chăm sóc cho tuần kế tiếp.</p>"
  },
  {
    title: "Kinh nghiệm trồng dưa leo bằng giàn lưới",
    slug: "kinh-nghiem-trong-dua-leo-bang-gian-luoi",
    categorySlug: "nhat-ky-mua-vu",
    cropName: "Dưa leo",
    excerpt: "Giàn lưới chắc và việc hướng dây sớm giúp vườn dưa gọn, dễ thu hái.",
    contentHtml: "<p>Tôi dựng giàn trước khi cây leo mạnh để không làm động rễ sau này. Dây lưới cần căng vừa phải, cọc được chôn chắc ở các đầu hàng.</p><p>Mỗi sáng hướng những ngọn leo lệch về đúng dây, đồng thời bỏ lá già sát mặt đất. Vườn gọn giúp quan sát hoa, quả và sâu bệnh thuận tiện hơn.</p>"
  },
  {
    title: "Cách ghi chép chi phí cho một vụ rau",
    slug: "cach-ghi-chep-chi-phi-cho-mot-vu-rau",
    categorySlug: "nhat-ky-mua-vu",
    cropName: "Rau màu",
    excerpt: "Một sổ ghi chép đơn giản giúp biết rõ tiền giống, vật tư và công chăm sóc.",
    contentHtml: "<p>Chia sổ thành các mục giống, vật tư, nước tưới, công lao động và thu hoạch. Ghi ngay sau khi phát sinh để tránh quên các khoản nhỏ.</p><p>Cuối vụ, cộng tổng chi và đối chiếu với sản lượng, giá bán thực tế. Dữ liệu này hữu ích hơn cảm giác khi chọn cây trồng cho vụ tiếp theo.</p>"
  },
  {
    title: "Bài học từ vụ ớt gặp mưa kéo dài",
    slug: "bai-hoc-tu-vu-ot-gap-mua-keo-dai",
    categorySlug: "nhat-ky-mua-vu",
    cropName: "Ớt",
    excerpt: "Kinh nghiệm cải thiện rãnh thoát nước và theo dõi gốc cây sau nhiều ngày mưa.",
    contentHtml: "<p>Mưa kéo dài làm một số luống ớt bị úng cục bộ. Sau vụ này, tôi nhận ra cần kiểm tra rãnh trước mùa mưa thay vì đợi nước dâng mới xử lý.</p><p>Tôi cũng tỉa bớt lá sát đất và chia việc kiểm tra theo khu. Những thay đổi nhỏ giúp phát hiện cây yếu sớm và giảm công xử lý về sau.</p>"
  }
];

function toContentText(contentHtml: string): string {
  return contentHtml.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

async function seedDemoPosts(client: pg.PoolClient, adminEmail: string): Promise<void> {
  for (const [index, post] of demoPosts.entries()) {
    await client.query(
      `INSERT INTO posts(
         author_id, category_id, title, slug, crop_name, excerpt, content_html, content_text, status, published_at
       )
       SELECT u.id, c.id, $2, $3, $4, $5, $6, $7, 'PUBLISHED', NOW() - ($8::int * INTERVAL '1 day')
       FROM users u
       JOIN categories c ON c.slug = $9
       WHERE u.email = $1
       ON CONFLICT (slug) DO UPDATE SET
         author_id = EXCLUDED.author_id,
         category_id = EXCLUDED.category_id,
         title = EXCLUDED.title,
         crop_name = EXCLUDED.crop_name,
         excerpt = EXCLUDED.excerpt,
         content_html = EXCLUDED.content_html,
         content_text = EXCLUDED.content_text,
         status = EXCLUDED.status,
         published_at = EXCLUDED.published_at,
         deleted_at = NULL`,
      [
        adminEmail,
        post.title,
        post.slug,
        post.cropName,
        post.excerpt,
        post.contentHtml,
        toContentText(post.contentHtml),
        index + 1,
        post.categorySlug
      ]
    );
  }
}

async function seed(): Promise<void> {
  const env = loadEnv();
  const pool = createPool(env.DATABASE_URL);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query(await readFile(seedFile, "utf8"));

    if (env.ADMIN_EMAIL && env.ADMIN_PASSWORD) {
      const passwordHasher = new ArgonPasswordHasher(env.PASSWORD_PEPPER);
      const passwordHash = await passwordHasher.hash(env.ADMIN_PASSWORD);
      const slugBase = toSlug(env.ADMIN_FULL_NAME) || "quan-tri-vien";

      await client.query(
        `INSERT INTO users(role_id, email, password_hash, full_name, slug)
         SELECT r.id, $1, $2, $3, $4
         FROM roles r
         WHERE r.name = 'ADMIN'
         ON CONFLICT (email) DO UPDATE SET
           role_id = EXCLUDED.role_id,
           password_hash = EXCLUDED.password_hash,
           full_name = EXCLUDED.full_name`,
        [env.ADMIN_EMAIL.toLowerCase(), passwordHash, env.ADMIN_FULL_NAME, slugBase]
      );
      await seedDemoPosts(client, env.ADMIN_EMAIL.toLowerCase());
    }

    await client.query("COMMIT");
    console.log("Đã seed role, category, admin và bài viết mẫu (nếu được cấu hình).");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

await seed();
